import { GoogleGenAI } from '@google/genai';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

import {
  Dependency,
  DependencyApiResponse,
  TransitiveDependency,
  IndividualAgentState,
  GlobalAgentState,
} from '../constants/model';
import { prompts } from '../prompts/prompts';
import conflictResolutionResponseSchema from '../prompts/schemas/conflict_resolution_response_schema.json';
import fixOptimizationResponseSchema from '../prompts/schemas/fix_optimization_response_schema.json';
import globalFixPlanResponseSchema from '../prompts/schemas/global_fix_plan_response_schema.json';
import strategyRecommendationResponseSchema from '../prompts/schemas/strategy_recommendation_response_schema.json';
import vulnerabilityFixResponseSchema from '../prompts/schemas/vulnerability_fix_plan_response_schema.json';
import { parseAiResponseParts } from '../utils/utils';

/**
 * FOR AI: This Agent Service uses LangGraph to handle agentic AI tasks.
 * The tasks include processing the final dependency data from analysis_service.ts
 * and using that data to generate a comprehensive fix plan for vulnerabilities.
 * I use LangGraph to create agents to handle this workflow and Gemini AI as the LLM provider.
 * This service is designed to be modular and can be extended with more agents as needed.
 */

/**
 * Agents Workflow:
 *
 * PHASE 1: **Individual Dependency Analysis and Fix Plan Generation**
 * 1. Dependency Analysis Agent: Gets the dependency data from analysis_service.ts, does this in batches.
 *
 * 2. Vulnerability Fix Agent: Gets the vulnerabilities from the dependency data and generates a fix plan. Includes the transitive dependencies vulnerabilities as well for a comprehensive fix. The agent will generate a fix plan for each vulnerability with respect parent-child relationships.
 *
 * 3. Contexutalizer: Combines the separate fix plans into a single comprehensive fix plan separated by file[dependencies] and then sends it back to the user.
 *
 * PHASE 2: **Global Analysis and Optimization of Fix Plans**
 *
 * 4. Global Analysis Agent: Analyzes all individual fix plans to identify overarching themes, common vulnerabilities, and potential optimizations that can be applied globally across the project.
 *
 * 5. Fix Optimization Agent: Optimizes the combined fix plans for efficiency and combining them where possible to reduce redundancy and overlaps.
 *
 * 6. Conflict Resolution Agent: Analyzes the optimized fix plan to identify and resolve any conflicts or overlaps between fixes.
 *
 * 7. Strategy Recommendation Agent: Generates a comprehensive implementation strategy recommendation based on the resolved fix plan.
 */
class AgentsService {
  private ai: GoogleGenAI;
  private context: Record<string, unknown>;
  private analysisData: DependencyApiResponse;
  private flattenedAnalysisData: Dependency[];
  private progressCallback: (
    step: string,
    message: string,
    data?: Record<string, unknown>,
  ) => void;

  constructor(analysisData: DependencyApiResponse) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    this.flattenedAnalysisData = [];
    this.analysisData = analysisData;
    this.context = {};
    this.flattenDependencies();
    this.progressCallback = () => {};
  }

  /**
   * Flatten Depdendencies for easier processing in agents (direct + transitive)
   * @returns void
   */
  flattenDependencies() {
    const dependencyAnalysisData = Object.entries(
      this.analysisData.dependencies,
    ).flatMap(([filePath, deps]) => {
      return deps.map((dep) => ({
        ...dep,
        filePath,
        dependencyLevel: 'direct' as const,
        parentDependency: null,
        dependencyChain: `${filePath} -> ${dep.name}@${dep.version}`,
      }));
    });

    const transitiveDepsAnalysisData = dependencyAnalysisData.flatMap((dep) => {
      return (
        dep.transitiveDependencies?.nodes
          ?.filter((node) => {
            return (
              node.dependencyType !== 'SELF' &&
              node.vulnerabilities &&
              node.vulnerabilities.length > 0
            );
          })
          .map((node) => ({
            ...node,
            filePath: dep.filePath,
            dependencyLevel: 'transitive' as const,
            parentDependency: `${dep.name}@${dep.version}`,
            dependencyChain: `${dep.filePath} -> ${dep.name}@${dep.version} -> ${node.name}@${node.version}`,
          })) ?? []
      );
    });

    // Remove duplicates while preserving the first occurrence and its context
    const uniqueTransitiveDeps = transitiveDepsAnalysisData.filter(
      (dep, index, array) => {
        const depKey = `${dep.name}@${dep.version}`;
        return (
          array.findIndex((d) => `${d.name}@${d.version}` === depKey) === index
        );
      },
    );

    this.flattenedAnalysisData = [
      ...dependencyAnalysisData,
      ...uniqueTransitiveDeps,
    ];

    // console.log(
    //   'Flattened dependencies:',
    //   this.flattenedAnalysisData,
    //   this.flattenedAnalysisData.length,
    // );
  }

  /**
   * this handles the individual fix plan workflow orchestration using LangGraph
   * @returns Langgraph workflow for individual fix plan generation
   */
  createIndividualFixPlanWorkflow() {
    const AgentStateAnnotation = Annotation.Root({
      dependencyData: Annotation<Dependency>(),
      currentIndex: Annotation<number>(),
      vulnerabilityFixPlans: Annotation<{
        [dep: string]: Record<string, unknown>;
      }>(),
      referenceSummary: Annotation<string>(),
      finalFixPlan: Annotation<string>(),
      errors: Annotation<string[]>(),
    });

    const graph = new StateGraph(AgentStateAnnotation);

    graph
      .addNode('DependencyAnalysisAgent', this.dependencyAnalysisAgent())
      .addNode('VulnerabilityFixAgent', this.vulnerabilityFixAgent())
      .addNode('ReferenceAgent', this.referenceAgent())
      .addNode('ContextualizerAgent', this.contextualizerAgent())
      .addEdge(START, 'DependencyAnalysisAgent')
      .addEdge('DependencyAnalysisAgent', 'VulnerabilityFixAgent')
      .addEdge('VulnerabilityFixAgent', 'ReferenceAgent')
      .addEdge('ReferenceAgent', 'ContextualizerAgent')
      .addConditionalEdges(
        'ContextualizerAgent',
        (state: IndividualAgentState) => {
          if (state.currentIndex < this.flattenedAnalysisData.length) {
            return 'DependencyAnalysisAgent';
          }
          return END;
        },
      );

    return graph.compile();
  }

  /**
   * Creates a Langgraph workflow for global fix plan generation of dependencies and vulnerabilities.
   * @returns Langgraph workflow for global fix plan generation
   */
  createGlobalAnalysisWorkflow() {
    const GlobalStateAnnotation = Annotation.Root({
      vulnerabilityFixPlans: Annotation<{
        [dep: string]: Record<string, unknown>;
      }>(),
      context: Annotation<Record<string, unknown>>(),
      globalAnalysis: Annotation<Record<string, unknown>>(),
      optimizedPlan: Annotation<Record<string, unknown>>(),
      conflictResolutionPlan: Annotation<Record<string, unknown>>(),
      finalStrategy: Annotation<Record<string, unknown>>(),
      errors: Annotation<string[]>(),
    });

    const graph = new StateGraph(GlobalStateAnnotation);

    graph
      .addNode('GlobalPlanningAgent', this.globalFixPlanningAgent())
      .addNode('FixOptimizationAgent', this.fixOptimizationAgent())
      .addNode('ConflictResolutionAgent', this.conflictResolutionAgent())
      .addNode(
        'StrategyRecommendationAgent',
        this.strategyRecommendationAgent(),
      )
      .addEdge(START, 'GlobalPlanningAgent')
      .addEdge('GlobalPlanningAgent', 'FixOptimizationAgent')
      .addEdge('FixOptimizationAgent', 'ConflictResolutionAgent')
      .addEdge('ConflictResolutionAgent', 'StrategyRecommendationAgent')
      .addEdge('StrategyRecommendationAgent', END);

    return graph.compile();
  }

  /**
   * Generates a comprehensive fix plan for all dependencies and vulnerabilities using LangGraph agents.
   * It does it in two phases:
   * 1. Individual dependency analysis and fix plan generation,
   * 2. Global analysis and optimization of fix plans.
   * @param progressCallback SSE progress callback to send the progress with response chunk to the client
   * @returns final comprehensive fix plan state object from global analysis
   */
  async generateComprehensiveFixPlan(
    progressCallback: (
      step: string,
      message: string,
      data?: Record<string, unknown>,
    ) => void,
  ) {
    // Phase 1: Individual Dependency Analysis and Fix Plan Generation
    const graph = this.createIndividualFixPlanWorkflow();
    await this.createContext();

    this.progressCallback = progressCallback;

    const individualResults = await graph.invoke(
      {
        dependencyData: {} as Dependency,
        currentIndex: 0,
        vulnerabilityFixPlans: {},
        referenceSummary: '',
        finalFixPlan: '',
        errors: [],
      },
      { recursionLimit: Infinity },
    );

    console.log('RESULT FINAL FIX PLAN:');
    console.dir(individualResults.finalFixPlan, { depth: null });
    console.log(
      await this.ai.models.countTokens({
        model: 'gemini-2.5-flash',
        contents: JSON.stringify(individualResults),
      }),
    );

    // Phase 2: Global Analysis and Optimization of Fix Plans
    // this.progressCallback(
    //   'global_analysis_phase_started',
    //   'Starting global analysis and optimization of individual fix plans',
    //   {
    //     phase: 'global_analysis',
    //     totalIndividualPlans: Object.keys(
    //       individualResults.vulnerabilityFixPlans,
    //     ).length,
    //   },
    // );

    const globalGraph = this.createGlobalAnalysisWorkflow();
    const globalResults = await globalGraph.invoke(
      {
        vulnerabilityFixPlans: individualResults.vulnerabilityFixPlans,
        context: this.context,
        globalAnalysis: {},
        optimizedPlan: {},
        conflictResolutionPlan: {},
        finalStrategy: {},
        errors: [],
      },
      { recursionLimit: Infinity },
    );

    // images of graphs
    // await generateGraphImage(graph);
    // await generateGraphImage(globalGraph);

    console.log('GLOBAL FIX PLAN:');
    console.dir(globalResults, { depth: null });
    console.log(
      await this.ai.models.countTokens({
        model: 'gemini-2.5-flash',
        contents: JSON.stringify(globalResults),
      }),
    );
    return globalResults;
  }

  /**
   * Agent that processes the next dependency from the flattened list
   * @returns updated dependency object in the graph state for next dependency to be analysed
   */
  dependencyAnalysisAgent() {
    return (state: IndividualAgentState) => {
      // Check if we've processed all dependencies
      if (state.currentIndex >= this.flattenedAnalysisData.length) {
        return {
          ...state,
        };
      }

      const currentDependency = this.flattenedAnalysisData[state.currentIndex];
      console.log(
        `Processing dependency ${state.currentIndex + 1}/${this.flattenedAnalysisData.length}: ${currentDependency.name}`,
      );

      // Send progress update
      this.progressCallback(
        'dependency_analysis',
        `Processing dependency ${state.currentIndex + 1}/${this.flattenedAnalysisData.length}: ${currentDependency.name}@${currentDependency.version}`,
        {
          dependencyIndex: state.currentIndex,
          dependencyName: currentDependency.name,
          dependencyVersion: currentDependency.version,
          totalDependencies: this.flattenedAnalysisData.length,
          vulnerabilityCount: currentDependency.vulnerabilities?.length ?? 0,
        },
      );

      return {
        ...state,
        dependencyData: currentDependency,
      };
    };
  }

  /**
   * Vulnerability Fix Agent
   * This agent takes in a dependency with its vulnerabilities and transitive deps and generates a fix plan.
   * It also considers transitive dependencies and their vulnerabilities.
   * The agent will generate a fix plan for each vulnerability with respect parent-child relationships.
   */
  vulnerabilityFixAgent() {
    return async (state: IndividualAgentState) => {
      const { dependencyData, vulnerabilityFixPlans } = state;
      const vulnerabilitiesFixplans = { ...vulnerabilityFixPlans };

      // Skip if no dependency data or no vulnerabilities
      if (
        !dependencyData?.vulnerabilities ||
        dependencyData.vulnerabilities.length === 0
      ) {
        console.log(
          `Skipping ${dependencyData?.name || 'unknown'} - no vulnerabilities`,
        );
        return {
          ...state,
          vulnerabilityFixPlans: vulnerabilitiesFixplans,
        };
      }

      const fixPrompt = prompts.INDIVIDUAL_VULNERABILITY_FIX_PLAN_GENERATION;

      try {
        console.log(
          `Generating fix plan for ${dependencyData.name}@${dependencyData.version}`,
        );

        // Send progress update for vulnerability analysis
        this.progressCallback(
          'vulnerability_analysis_started',
          `Analyzing vulnerabilities for ${dependencyData.name}@${dependencyData.version} (${dependencyData.vulnerabilities.length} vulnerabilities found)`,
          {
            dependencyName: dependencyData.name,
            dependencyVersion: dependencyData.version,
            vulnerabilityCount: dependencyData.vulnerabilities.length,
            stage: 'analyzing',
          },
        );

        //API CALL
        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fixPrompt.template.replace(
            '{{dependencyData}}',
            JSON.stringify(dependencyData),
          ),
          config: {
            systemInstruction: `${fixPrompt.system}\n\nContext:${fixPrompt.context.replace('{{context}}', JSON.stringify(this.context))}\n\nConstraints: ${fixPrompt.constraints.join(' ')}`,
            responseMimeType: 'application/json',
            responseJsonSchema: vulnerabilityFixResponseSchema,
          },
        });

        if (!response?.candidates?.[0]?.content?.parts) {
          this.progressCallback(
            'vulnerability_analysis_error',
            `Error: No response from AI model for ${dependencyData.name}@${dependencyData.version}`,
            {
              dependencyName: dependencyData.name,
              dependencyVersion: dependencyData.version,
              stage: 'error',
            },
          );

          console.log(
            `No response from AI model for ${dependencyData.name}@${dependencyData.version}`,
          );
          //handle error
          return {
            ...state,
            errors: [
              ...(state.errors ?? []),
              `No response from AI model for ${dependencyData.name}`,
            ],
          };
        }

        // Analyze response parts structure
        const parts = response.candidates[0].content.parts;
        const parsedResponse = parseAiResponseParts(parts);

        const fixPlanData =
          typeof parsedResponse === 'string'
            ? JSON.parse(parsedResponse)
            : parsedResponse;

        vulnerabilitiesFixplans[
          `${dependencyData.name}@${dependencyData.version}`
        ] = fixPlanData;

        // Send progress update with the completed fix plan
        this.progressCallback(
          'vulnerability_analysis_complete',
          `Fix plan generated for ${dependencyData.name}@${dependencyData.version}`,
          {
            dependencyName: dependencyData.name,
            dependencyVersion: dependencyData.version,
            fixPlan: fixPlanData,
            stage: 'completed',
          },
        );

        console.log(
          `Generated fix plan for ${dependencyData.name}@${dependencyData.version}`,
        );
      } catch (error) {
        console.log(
          `ERROR generating fix plan for ${dependencyData.name}:`,
          error,
        );
        this.progressCallback(
          'vulnerability_analysis_error',
          `Can't generate fix plan for ${dependencyData.name}@${dependencyData.version}`,
          {
            dependencyName: dependencyData.name,
            dependencyVersion: dependencyData.version,
            stage: 'error',
          },
        );
        return {
          ...state,
          errors: [
            ...(state.errors ?? []),
            `Couldn't generate fix plan for ${dependencyData.name}`,
          ],
        };
      }
      return {
        ...state,
        vulnerabilityFixPlans: vulnerabilitiesFixplans,
      };
    };
  }

  /**
   * TODO: To implement reference summary generation for contextualizing fix plans
   * @returns null
   */
  referenceAgent() {
    return (state: IndividualAgentState) => {
      return {
        ...state,
        referenceSummary: 'Reference summary placeholder',
      };
    };
  }

  /**
   * Combines individual fix plans into a comprehensive fix plan
   * @returns final combined fix plans for all the dependencies
   */
  contextualizerAgent() {
    return (state: IndividualAgentState) => {
      const {
        dependencyData,
        currentIndex,
        vulnerabilityFixPlans,
        referenceSummary,
      } = state;

      console.log(
        `ContextualizerAgent processing dependency ${currentIndex + 1}: ${dependencyData?.name}@${dependencyData?.version}`,
      );
      console.log(`Reference Summary: ${referenceSummary}`);

      // Increment the current index to move to the next dependency
      const nextIndex = currentIndex + 1;

      console.log(
        `Completed processing for ${dependencyData?.name}@${dependencyData?.version}, moving to index ${nextIndex}`,
      );

      // The final fix plan will be generated when all dependencies are processed
      // For now, just pass through the state with the incremented index
      return {
        ...state,
        currentIndex: nextIndex,
        finalFixPlan: JSON.stringify(vulnerabilityFixPlans, null, 2),
      };
    };
  }

  /**
   * ===========================================================================
   * Enhanced global fix plan generation with contextual understanding of the graph data.
   * This will involve creating additional agents that can analyze the dependency graph structure,
   * identify critical paths, and prioritize fixes based on impact.
   * The agents will work together to produce a more effective and efficient fix plan.
   * The LLM will have necessary context to understand the relations between dependencies and the vulnerabilities.
   * ===========================================================================
   */

  /**
   * Agent that processes the combined fix plans for global synthesis with the context of the entire dependency graph and metadata
   * @returns updated state with global analysis data/error
   */
  globalFixPlanningAgent() {
    return async (state: GlobalAgentState) => {
      const { vulnerabilityFixPlans, context } = state;

      try {
        this.progressCallback(
          'global_planning_start',
          'Analyzing individual fix plans for global synthesis',
          {
            stage: 'global_analysis',
            totalFixPlans: Object.keys(vulnerabilityFixPlans).length,
          },
        );

        const globalPrompt = prompts.GLOBAL_FIX_PLAN_GENERATION;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: globalPrompt.allFixPlans.replace(
            '{{allFixPlans}}',
            JSON.stringify(vulnerabilityFixPlans),
          ),
          config: {
            systemInstruction: `${globalPrompt.system}\n\nContext:${globalPrompt.context.replace('{{context}}', JSON.stringify(context))}\n\nConstraints: ${globalPrompt.constraints.join(' ')}`,
            responseMimeType: 'application/json',
            responseJsonSchema: globalFixPlanResponseSchema,
          },
        });

        if (!response?.candidates?.[0]?.content?.parts) {
          throw new Error(
            'No response from AI model for global fix plan generation',
          );
        }

        const globalAnalysisData = parseAiResponseParts(
          response.candidates[0].content.parts,
        );

        this.progressCallback(
          'global_planning_complete',
          'Global fix plan synthesis completed',
          {
            globalFixPlan: JSON.stringify(globalAnalysisData, null, 2),
            stage: 'complete',
          },
        );

        return {
          ...state,
          globalFixPlan: JSON.stringify(globalAnalysisData, null, 2),
        };
      } catch (error) {
        console.log('ERROR in GlobalPlanningAgent:', error);
        this.progressCallback(
          'global_planning_error',
          'Error during global fix plan generation',
          { stage: 'global_error', error: String(error) },
        );
        return {
          ...state,
          errors: [
            ...(state.errors ?? []),
            `Error in GlobalPlanningAgent: ${error}`,
          ],
        };
      }
    };
  }

  /**
   * Agent that optimizes the combined fix plans for efficiency and combining them where possible to reduce redundancy and overlaps.
   * @returns updated state with optimized fix plan/error
   */
  fixOptimizationAgent() {
    return async (state: GlobalAgentState) => {
      const { vulnerabilityFixPlans, globalFixPlan } = state;

      try {
        this.progressCallback(
          'fix_optimization_start',
          'Analyzing and optimizing fix plans for efficiency',
          { stage: 'optimization_analysis' },
        );

        const optimizationPrompt = prompts.FIX_OPTIMIZATION_ANALYSIS;

        // Combine both individual plans and global analysis for optimization
        const combinedData = {
          individualFixPlans: vulnerabilityFixPlans,
          globalAnalysis: globalFixPlan,
        };

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: optimizationPrompt.template.replace(
            '{{vulnerabilityFixPlans}}',
            JSON.stringify(combinedData),
          ),
          config: {
            systemInstruction: `${optimizationPrompt.system}\n\nContext:${optimizationPrompt.context.replace(
              '{{context}}',
              JSON.stringify(this.context),
            )}\n\nConstraints: ${optimizationPrompt.constraints.join(' ')}`,
            responseMimeType: 'application/json',
            responseJsonSchema: fixOptimizationResponseSchema,
          },
        });

        const optimizationData = parseAiResponseParts(
          response?.candidates?.[0]?.content?.parts ?? [],
        );

        this.progressCallback(
          'fix_optimization_complete',
          'Fix plan optimization completed',
          {
            optimisedPlan: JSON.stringify(optimizationData, null, 2),
            stage: 'complete',
          },
        );

        return {
          ...state,
          optimizedPlan: JSON.stringify(optimizationData),
        };
      } catch (error) {
        console.log('ERROR in FixOptimizationAgent:', error);
        this.progressCallback(
          'fix_optimization_error',
          'Error during fix plan optimization',
          { stage: 'optimization_error', error: String(error) },
        );
        return {
          ...state,
          errors: [
            ...(state.errors ?? []),
            `Error in FixOptimizationAgent: ${error}`,
          ],
        };
      }
    };
  }

  /**
   * Agent that analyzes the optimized fix plan to identify and resolve any conflicts or overlaps between fixes.
   * @returns updated state with conflict resolution/error
   */
  conflictResolutionAgent() {
    return async (state: GlobalAgentState) => {
      const { optimizedPlan } = state;

      try {
        this.progressCallback(
          'conflict_resolution_start',
          'Analyzing potential conflicts in optimized fix plan',
          { stage: 'conflict_analysis' },
        );

        const conflictPrompt = prompts.CONFLICT_RESOLUTION_STRATEGY;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: conflictPrompt.template.replace(
            '{{optimizedFixPlan}}',
            JSON.stringify(optimizedPlan),
          ),
          config: {
            systemInstruction: `${conflictPrompt.system}\n\n${conflictPrompt.context.replace('{{context}}', JSON.stringify(this.context))}\n\nConstraints: ${conflictPrompt.constraints.join(' ')}`,
            responseMimeType: 'application/json',
            responseJsonSchema: conflictResolutionResponseSchema,
          },
        });

        const conflictResolutionPlan = parseAiResponseParts(
          response?.candidates?.[0]?.content?.parts ?? [],
        );

        this.progressCallback(
          'conflict_resolution_complete',
          'Conflict resolution analysis completed',
          {
            conflictResolutionPlan: JSON.stringify(
              conflictResolutionPlan,
              null,
              2,
            ),
            stage: 'complete',
          },
        );

        return {
          ...state,
          conflictResolutionPlan: JSON.stringify(
            conflictResolutionPlan,
            null,
            2,
          ),
        };
      } catch (error) {
        console.log('ERROR in ConflictResolutionAgent:', error);
        this.progressCallback(
          'conflict_resolution_error',
          'Error during conflict resolution analysis',
          { stage: 'conflict_error', error: String(error) },
        );
        return {
          ...state,
          errors: [
            ...(state.errors ?? []),
            `Error in ConflictResolutionAgent: ${error}`,
          ],
        };
      }
    };
  }

  /**
   * Agent that generates a comprehensive implementation strategy recommendation based on the resolved fix plan.
   * @returns updated state with final strategy/error
   */
  strategyRecommendationAgent() {
    return async (state: GlobalAgentState) => {
      const { conflictResolutionPlan: conflictResolutionPlan } = state;

      try {
        this.progressCallback(
          'strategy_recommendation_start',
          'Generating comprehensive implementation strategy',
          { stage: 'strategy_generation' },
        );

        const strategyPrompt = prompts.STRATEGY_RECOMMENDATION;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: strategyPrompt.template.replace(
            '{{optimizedFixPlan}}',
            JSON.stringify(conflictResolutionPlan),
          ),
          config: {
            systemInstruction: `${strategyPrompt.system}\n\n${strategyPrompt.context.replace('{{context}}', JSON.stringify(this.context))}\n\nConstraints: ${strategyPrompt.constraints.join(' ')}`,
            responseMimeType: 'application/json',
            responseJsonSchema: strategyRecommendationResponseSchema,
          },
        });

        const finalStrategy = parseAiResponseParts(
          response?.candidates?.[0]?.content?.parts ?? [],
        );

        this.progressCallback(
          'strategy_recommendation_complete',
          'Comprehensive strategy recommendation completed',
          { finalStrategy: finalStrategy, stage: 'complete' },
        );

        return {
          ...state,
          finalStrategy: JSON.stringify(finalStrategy, null, 2),
        };
      } catch (error) {
        console.log('ERROR in StrategyRecommendationAgent:', error);
        this.progressCallback(
          'strategy_recommendation_error',
          'Error during strategy recommendation generation',
          { stage: 'strategy_error', error: String(error) },
        );
        return {
          ...state,
          errors: [
            ...(state.errors ?? []),
            `Error in StrategyRecommendationAgent: ${error}`,
          ],
        };
      }
    };
  }

  /**
   * ===========================================================================
   * UTILS FOR AGENTS TO USE CONTEXT OF DEPENDENCY GRAPH AND METADATA
   * ===========================================================================
   */

  /**
   * Create Context Management for agents to use
   * This function will compress the dependency graph and cache the context for efficient retrieval.
   */
  async createContext() {
    this.context = {
      graphMetadata: {
        totalFiles: Object.keys(this.analysisData.dependencies).length,
        totalVulnerabilities: this.getTotalVulnerabilitiesCount(),
        criticalVulnerabilities: this.getCriticalVulnerabilitiesCount(),
        fixableVulnerabilities: this.getFixableVulnerabilities(),
        mostVulnerableDependency: this.getMostVulnerableDependency(),
      },
      graph: Object.entries(this.analysisData.dependencies).map(
        ([filePath, deps]) => ({
          [filePath]: {
            deps: deps.map((dep) => {
              return {
                key: `${dep.name}@${dep.version}`,
                dependsOn: {
                  nodes: dep.transitiveDependencies?.nodes
                    ? Object.entries(dep.transitiveDependencies.nodes).map(
                        ([index, transDep]) => {
                          return {
                            nodeId: `${transDep.name}@${transDep.version}`,
                            nodeType: transDep.dependencyType,
                            connectionInfo: this.getConnectedPackages(
                              dep.transitiveDependencies ?? {},
                              Number(index),
                            ),
                            graphPath: `${filePath} -> ${dep.name}@${dep.version} -> ${transDep.name}@${transDep.version}`,
                          };
                        },
                      )
                    : [],
                },
                graphPath: `${filePath} -> ${dep.name}@${dep.version}`,
              };
            }),
          },
        }),
      ),
    };
    console.log('Context cache contents:');
    console.dir(this.context, { depth: null });
    console.log(
      await this.ai.models.countTokens({
        model: 'gemini-2.5-flash',
        contents: JSON.stringify(this.context),
      }),
    );
  }

  /**
   *
   * This function retrieves connected packages for a given transitive dependency (both incoming and outgoing paths).
   * @param dep transitive dependency
   * @param index index of that dependency in the nodes list
   */
  getConnectedPackages(dep: TransitiveDependency, index: number) {
    const dependsOn = new Set<string>();
    const usedBy = new Set<string>();
    if (dep.edges && dep.nodes) {
      Object.entries(dep.edges).forEach(([_, edges]) => {
        if (edges.source === index && dep.nodes?.[edges.target]) {
          dependsOn.add(
            `${dep.nodes[edges.target].name}@${dep.nodes[edges.target].version}`,
          );
        }
        // Check if current node is the target (incoming connections)
        if (edges.target === index && dep.nodes?.[edges.source]) {
          usedBy.add(
            `${dep.nodes[edges.source].name}@${dep.nodes[edges.source].version}`,
          );
        }
      });
    }

    // Remove duplicates if any
    return {
      dependsOn: Array.from(dependsOn),
      usedBy: Array.from(usedBy),
    };
  }

  /**
   * returns the total number of vulnerabilities in the analysis data.
   * @returns returns total vulnerabilities count
   */
  getTotalVulnerabilitiesCount(): number {
    return Object.values(this.analysisData.dependencies).reduce(
      (total, deps) => {
        return (
          total +
          deps.reduce((depTotal: number, dep) => {
            const transitiveVulnCount =
              dep.transitiveDependencies?.nodes?.reduce(
                (transTotal: number, transDep) => {
                  return (
                    transTotal +
                    (transDep.vulnerabilities
                      ? transDep.vulnerabilities.length
                      : 0)
                  );
                },
                0,
              ) ?? 0;
            return (
              depTotal +
              (dep.vulnerabilities ? dep.vulnerabilities.length : 0) +
              transitiveVulnCount
            );
          }, 0)
        );
      },
      0,
    );
  }

  /**
   * Calculates the number of critical vulnerabilities in the analysis data.
   * @returns number of critical vulnerabilities
   */
  getCriticalVulnerabilitiesCount(): number {
    return 0;
  }

  /**
   * Calculates the number of fixable vulnerabilities in the analysis data.
   * @returns number of fixable vulnerabilities
   */
  getFixableVulnerabilities(): number {
    return Object.values(this.analysisData.dependencies).reduce(
      (total, deps) => {
        return (
          total +
          deps.reduce((depTotal: number, dep) => {
            const transitiveFixableCount =
              dep.transitiveDependencies?.nodes?.reduce(
                (transTotal: number, transDep) => {
                  return (
                    transTotal +
                    (transDep.vulnerabilities
                      ? transDep.vulnerabilities.filter(
                          (vuln) => vuln.fixAvailable,
                        ).length
                      : 0)
                  );
                },
                0,
              ) ?? 0;
            return (
              depTotal +
              (dep.vulnerabilities
                ? dep.vulnerabilities.filter((vuln) => vuln.fixAvailable).length
                : 0) +
              transitiveFixableCount
            );
          }, 0)
        );
      },
      0,
    );
  }

  /**
   * Gets the most vulnerable dependency in the analysis data.
   * @returns most vulnerabable dependencies
   */
  getMostVulnerableDependency(): { [key: string]: number } {
    const mostVulnerableDeps: { [dep: string]: number } = {}; //package@version: vulnCount
    // Aggregate vulnerability counts across all dependency groups
    Object.entries(this.analysisData.dependencies).forEach(([_, deps]) => {
      deps.forEach((dep) => {
        const vulnCount = dep.vulnerabilities ? dep.vulnerabilities.length : 0;
        const key = `${dep.name}@${dep.version}`;
        mostVulnerableDeps[key] = (mostVulnerableDeps[key] || 0) + vulnCount;
      });
    });

    // Find the dependency with the highest vulnerability count
    let maxVulns = 0;
    let mostVulnerableDep = '';

    Object.entries(mostVulnerableDeps).forEach(([dep, vulnCount]) => {
      if (vulnCount > maxVulns) {
        maxVulns = vulnCount;
        mostVulnerableDep = dep;
      }
    });
    return { [mostVulnerableDep]: maxVulns };
  }
}

export default AgentsService;
