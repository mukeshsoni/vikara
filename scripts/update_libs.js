import { exec } from "child_process";

import path from "path";

// The folder where rust build puts the target binary varies based on the target and profile.
// For example, for a release build on macOS x86_64, it would be:
// target/x86_64-apple-darwin/release/Vikara
function getReleasePath() {
  const target = process.env.CARGO_BUILD_TARGET || "";
  const profile = process.env.PROFILE || "release";
  const binaryName = "Vikara"; // replace with actual name

  const binaryPath = target
    ? path.join("target", target, profile, binaryName)
    : path.join("target", profile, binaryName);
  console.log("Executable is at:", binaryPath);
  return binaryPath;
}

const command = `dylibbundler -od -b -x src-tauri/${getReleasePath()} -d src-tauri/external-libs -p '@executable_path/../Frameworks'`;
const updateRpathCommand = `install_name_tool -add_rpath @executable_path/../Frameworks src-tauri/${getReleasePath()}`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing command: ${error.message}`);
    // We exit with status 1 so that the whole build fails if this step fails
    // It was failing silently on github CI and the external libs were not being bundled in the
    // resulting binary
    return process.exit(1);
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    // We exit with status 1 so that the whole build fails if this step fails
    // It was failing silently on github CI and the external libs were not being bundled in the
    // resulting binary
    return;
  }
  console.log(`stdout: ${stdout}`);
});

// This is probably not required since dylibbundler already handles the rpath
// Keeping it for just in case scenarios
exec(updateRpathCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing command: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
});
