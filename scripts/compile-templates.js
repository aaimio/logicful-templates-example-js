const { transform } = require('@babel/core');
const fs = require('fs');
const { compileTemplate } = require('logicful-templates');
const path = require('path');
const rimraf = require('rimraf');

/**
 * The path to where we'll emit the compiled HTML
 */
const distPath = path.resolve(__dirname, '../dist');

/**
 * A temporary folder to write transpiled JSX to
 */
const transpiledPath = path.resolve(__dirname, '../transpiled');

const isExistingFileOrFolder = (targetPath) => {
  return new Promise((resolve, reject) => {
    fs.stat(targetPath, (error) => {
      if (!error) {
        resolve(true);
      } else if (error.code === 'ENOENT') {
        resolve(false);
      } else {
        reject(error);
      }
    });
  });
};

const readFile = (targetPath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(targetPath, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data.toString());
      }
    });
  });
};

const transformFile = (code) => {
  return new Promise((resolve, reject) => {
    transform(
      code,
      {
        /**
         * This should point to your Babel configuration.
         */
        configFile: path.resolve(__dirname, '..', '.babelrc'),
      },
      (error, output) => {
        if (error) {
          reject(error);
        } else {
          resolve(output.code);
        }
      }
    );
  });
};

const writeFile = (targetPath, contents) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(targetPath, contents, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

const createFolder = async (targetPath) => {
  const isExistingFolder = await isExistingFileOrFolder(targetPath);

  if (!isExistingFolder) {
    return new Promise((resolve, reject) => {
      fs.mkdir(targetPath, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
};

const deleteFolder = async (targetPath) => {
  const isExistingFolder = await isExistingFileOrFolder(targetPath);

  if (isExistingFolder) {
    return new Promise((resolve, reject) => {
      rimraf(targetPath, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
};

const cleanFolder = async (targetPath) => {
  const isExistingFolder = await isExistingFileOrFolder(targetPath);

  if (isExistingFolder) {
    await deleteFolder(targetPath);
    await createFolder(targetPath);
  } else {
    await createFolder(targetPath);
  }
};

const compileTemplates = async () => {
  // An array of paths pointing to your "raw" JSX files
  const paths = [path.resolve(__dirname, '..', 'templates', 'index.jsx')];

  for (let i = 0; i < paths.length; i++) {
    const currentPath = paths[i];
    const isExistingFile = await isExistingFileOrFolder(currentPath);

    if (!isExistingFile) {
      console.warn('Could not find file at: ' + currentPath);
      continue;
    }

    const fileContents = await readFile(currentPath);
    const transpiledFileContents = await transformFile(fileContents);
    const transpiledFileName = `${path.parse(path.basename(paths[i])).name}.js`;
    const transpiledOutputPath = path.resolve(transpiledPath, transpiledFileName);

    await writeFile(transpiledOutputPath, transpiledFileContents);

    const module = require(transpiledOutputPath);

    if (!module.default) {
      console.warn('Could not find default export in: ' + transpiledOutputPath);
      continue;
    }

    const htmlContents = compileTemplate(() => module.default(), { pretty: true });
    const htmlFileName = `${path.parse(path.basename(paths[i])).name}.html`;
    const htmlOutputPath = path.resolve(distPath, htmlFileName);

    await writeFile(htmlOutputPath, htmlContents);
    console.log('Wrote ' + htmlOutputPath);
  }
};

const run = async () => {
  await cleanFolder(distPath);
  console.log('Cleaned ' + distPath);

  await cleanFolder(transpiledPath);
  console.log('Cleaned ' + transpiledPath);

  await compileTemplates();
  console.log('Finished compiling templates');

  await deleteFolder(transpiledPath);
  console.log('Deleted temp ' + transpiledPath);
};

run();
