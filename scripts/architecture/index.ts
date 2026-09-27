import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { architectureConfig, resolveRepositoryPath } from "./config";
import { createDiagramGenerator } from "./diagram";
import { createGitService } from "./git";
import { createArchitectureHistory } from "./history";

const parseArguments = () => {
  const targetIndex = process.argv.indexOf("--target");
  return {
    targetName: targetIndex >= 0 ? process.argv[targetIndex + 1] : undefined,
    history: process.argv.includes("--history"),
  };
};

const generateCurrent = async (targetName: string) => {
  const target = architectureConfig.targets.find(({ name }) => name === targetName);
  if (!target) throw new Error("Unknown architecture target: " + targetName);

  const diagram = await createDiagramGenerator().generate(process.cwd(), target);
  if (diagram.status !== "available" || !diagram.mermaid) {
    throw new Error(
      target.name + " is unavailable: " + (diagram.reason ?? "unknown reason"),
    );
  }

  const outputDirectory = resolveRepositoryPath(
    process.cwd(),
    target.outputRoot ?? architectureConfig.generatedRoot,
  );
  await mkdir(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, target.name + ".mmd");
  await writeFile(outputPath, diagram.mermaid);
  console.log(
    "Generated " +
      path.join(target.outputRoot ?? architectureConfig.generatedRoot, target.name + ".mmd") +
      " (" +
      diagram.fingerprint +
      ")",
  );
};

const main = async () => {
  const { targetName, history } = parseArguments();
  const diagramGenerator = createDiagramGenerator();

  if (history) {
    const historyGenerator = createArchitectureHistory({
      git: createGitService(),
      diagramGenerator,
      config: architectureConfig,
    });
    const snapshots = await historyGenerator.run();
    console.log("Generated " + snapshots.length + " architecture snapshots");
    return;
  }

  await generateCurrent(targetName ?? "overview");
};

await main();
