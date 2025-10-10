import { writeFileSync } from 'fs';

import { GoogleGenAI } from '@google/genai';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

import { Dependency, DependencyApiResponse } from '../constants/constants';
import { prompts } from '../prompts/prompts';
import vulnerabilityFixResponseSchema from '../prompts/schemas/vulnerability_fix_plan_response_schema.json';
import { parseAiResponseParts } from '../utils/utils';

/**
 * FOR AI: This Agent Service uses LangGraph to handle agentic AI tasks.
 *The tasks include processing the final dependency data from analysis_service.ts
 * and using that data to generate a comprehensive fix plan for vulnerabilities.
 * I plan to use LangGraph to create agents to handle this workflow and Gemini AI as the LLM provider.
 * This service is designed to be modular and can be extended with more agents as needed.
 */

interface AgentState {
  dependencyData: Dependency;
  currentIndex: number;
  vulnerabilityFixPlans: { [dep: string]: Record<string, unknown> };
  referenceSummary: string;
  finalFixPlan: string;
  errors?: string[];
}

/** 
 * Agents to be created here for now:
 * ORCHESTRATOR: Handles the flow of data between agents and ensures that the final output is a comprehensive fix plan.
 * 1. Dependency Analysis Agent: Gets the dependency data from analysis_service.ts, does this in batches.
 * 2.i Vulnerability Fix Agent: Gets the vulnerabilities from the dependency data and generates a fix plan.
      Includes the transitive dependencies vulnerabilities as well for a comprehensive fix. The agent will generate a fix plan for each vulnerability with respect parent-child relationships.
 * 2.ii Reference Agent: goes through the reference links of the vulnerabilities and then summarizes the information and sends back to the Vulnerability Fix Agent.
 * 3. Contexutalizer: Combines the separate fix plans into a single comprehensive fix plan separated by file[dependencies] and then sends it back to the user.
*/
class AgentsService {
  private ai: GoogleGenAI;
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
    this.flattenDependencies();
    this.progressCallback = () => {};
  }

  flattenDependencies() {
    const dependencyAnalysisData = Object.entries(
      this.analysisData.dependencies,
    ).flatMap(([filePath, deps]) => {
      return deps.map((dep) => ({
        ...dep,
        filePath,
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
          })) ?? []
      );
    });

    this.flattenedAnalysisData = [
      ...dependencyAnalysisData,
      ...transitiveDepsAnalysisData,
    ];

    console.log(
      'Flattened dependencies:',
      this.flattenedAnalysisData,
      this.flattenedAnalysisData.length,
    );
  }

  dependencyAnalysisAgent() {
    return (state: AgentState) => {
      // Check if we've processed all dependencies
      if (state.currentIndex >= this.flattenedAnalysisData.length) {
        return {
          ...state,
          // Don't increment further if we're at the end
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
        // Don't increment here - let each agent pass through the index update
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
    return async (state: AgentState) => {
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

      const fixPrompt = prompts.VULNERABILITY_FIX_PLAN_GENERATION;

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

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash-lite',
          contents: fixPrompt.template.replace(
            '{{dependencyData}}',
            JSON.stringify(dependencyData),
          ),
          config: {
            systemInstruction: `${fixPrompt.system}\n\nConstraints: ${fixPrompt.constraints.join(' ')}`,
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
          `✅ Generated fix plan for ${dependencyData.name}@${dependencyData.version}`,
        );
      } catch (error) {
        console.log(
          `❌ ERROR generating fix plan for ${dependencyData.name}:`,
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
        //handle error
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

  referenceAgent() {
    return (state: AgentState) => {
      // TODO: Implement reference processing logic
      return {
        ...state,
        referenceSummary: 'Reference summary placeholder',
      };
    };
  }

  contextualizerAgent() {
    return (state: AgentState) => {
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

  //this handles the workflow orchestration using LangGraph
  createWorkflowAndOrchestrateAgents() {
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
      .addConditionalEdges('ContextualizerAgent', (state: AgentState) => {
        if (state.currentIndex < this.flattenedAnalysisData.length) {
          return 'DependencyAnalysisAgent';
        }
        return END;
      });

    return graph.compile();
  }

  // Public method to run the workflow
  async generateComprehensiveFixPlan(
    progressCallback: (
      step: string,
      message: string,
      data?: Record<string, unknown>,
    ) => void,
  ) {
    const graph = this.createWorkflowAndOrchestrateAgents();
    await this.generateGraphImage(graph);

    // Store the callback for use in agents
    this.progressCallback = progressCallback;

    const result = await graph.invoke(
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
    // console.dir(result, { depth: null });
    return result;
  }

  async generateGraphImage(
    graph: ReturnType<typeof StateGraph.prototype.compile>,
  ) {
    console.log('Generating graph visualization...');
    try {
      const graphImage = (await graph.getGraphAsync()).drawMermaidPng();
      const arrayBuffer = await (await graphImage).arrayBuffer();
      const filePath = './graph_image.png';
      writeFileSync(filePath, new Uint8Array(arrayBuffer));
      console.log(`Graph image saved to ${filePath}`);
    } catch (error) {
      console.error('Error generating or saving graph image:', error);
    }
  }
}

export default AgentsService;
