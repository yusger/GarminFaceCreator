await import("./build-widgets.mjs");
await import("./build-hand-images.mjs");
await import("./build-hand-styles.mjs");
await import("./build-layout-templates.mjs");
await import("./build-resource-library.mjs");
await import("./build-default-watchfaces.mjs");
await import("./update-reference-provenance.mjs");

// Reviewed study starter remains outside the default-reference catalogue.
const {mkdir:makeStudyDir,copyFile:copyStudy}=await import("node:fs/promises");
await makeStudyDir("frontend/public/design-studies",{recursive:true});
await copyStudy("resources/design-studies/native454/generated/project.json","frontend/public/design-studies/native454.json");
