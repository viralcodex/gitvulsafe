export const manifestFiles: { [key: string]: { file: string; icon: string } } =
  {
    npm: { file: "package.json", icon: "/js.svg" },
    PyPI: { file: "requirements.txt", icon: "/pipy.svg" },
    RubyGems: { file: "Gemfile", icon: "/ruby.svg" },
    Maven: { file: "pom.xml", icon: "/mvn.svg" },
    Pub: { file: "pubspec.yaml", icon: "/dart.svg" },
    Gradle: { file: "build.gradle", icon: "gradle" },
    cargo: { file: "Cargo.toml", icon: "cargo" },
    Composer: { file: "composer.json", icon: "composer" },
  };

export const progressSteps: { [key: string]: string } = {
  PARSING_MANIFESTS: "Parsing Manifest files",
  PARSING_DEPENDENCIES: "Parsing dependencies",
  FETCHING_TRANSITIVE_DEPENDENCIES: "Fetching transitive dependencies",
  FETCHING_VULNERABILTIES_ID: "Fetching vulnerabilities IDs",
  FETCHING_VULNERABILTIES_DETAILS: "Fetching vulnerabilities details",
  FINALISING_RESULTS: "Almost Done",
  TAKING_TOO_LONG: "Just a tad bit longer",
  IS_EVERYTHING_OK: "Hoping everything is okay",
};