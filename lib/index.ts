#!/usr/bin/env node

import { execSync as exec } from "child_process";
import * as fs from "fs-extra";
import * as inquirer from "inquirer";
import * as os from "os";
import * as path from "path";
import * as shell from "shelljs";
import * as Console from "console";
//import * as cmd from 'node-cmd';
//import * as simplegit from "simple-git"
var simplegit = require("simple-git");
//import simplegit from "simple-git/promise";

const envConfigPaths: any = { config_in: "./enviroment.config.json", config_out: "./enviroment/enviroment.ts" };
const readmePath: string = "./readme.md";
let envConfigVar: any;
let envConfigVarIn: any;

let allAnswers: any = [];
enum versiontype {
  major,
  minor,
  patch,
}


function ask() {
  inquirer
    .prompt([
      {
        type: "checkbox",
        message: "what changes",
        name: "what_changes",
        choices: [
          new inquirer.Separator(" = Select Changes = "),
          {
            name: "Feature: A new feature"
          },
          {
            name: "Fix: A bug fix"
          },
          {
            name: "Doc: Documentation only changes"
          },
          {
            name: "Style: Cosmetic only changes"
          },
          {
            name: "Refacturing: Code changes, nether features nor fixes"
          },
          {
            name: "Performance: Code changes that improves performance"
          },
          {
            name: "Test: Adding missing tests"
          },
          {
            name: "Enviroment: Changes to the build process, auxiliary tools or libraries"
          }
        ],
        validate: function (answer: { length: number; }): any {
          if (answer.length < 1) {
            return "You must choose at least 1 change.";
          }

          return true;
        }
      },
      {
        type: "confirm",
        name: "IsBreaking",
        message: "Is this breaking changes?",
        default: "n",
        choices: [
          {
            key: "y",
            name: "yes",
            value: "yes"
          },
          {
            key: "n",
            name: "no",
            value: "no"
          }
        ]
      }
    ])
    .then((answers: any) => {
      allAnswers.push(answers);
      let prompt_array: any = [];

      if (allAnswers[0].IsBreaking == true) {
        prompt_array.push({
          type: "input",
          name: "breaking_info",
          message: "Add bracking change description(s)"
        });
      }

      allAnswers[0].what_changes.forEach(function (val: string): void {
        let mystr: string = val.substr(0, 3);
        switch (mystr) {
          case "Fea":
            prompt_array.push({
              type: "input",
              name: "feature_info",
              message: "Add feature description(s)"
            });
            break;
          case "Fix":
            prompt_array.push({
              type: "input",
              name: "fix_info",
              message: "Add fix description(s)"
            });

            break;
          case "Env":
            prompt_array.push({
              type: "input",
              name: "env_info",
              message: "Add Enviromental change description(s)"
            });
            break;
          default:
          // code block
        }
      }
      );

      prompt_array.push({
        type: "input",
        name: "additional_info",
        message: "Any additional info"
      });


      inquirer
        .prompt(prompt_array).then((next_answers: any) => {
          allAnswers.push(next_answers);

          run_updates(allAnswers);
        });
    });
}

function run_updates(allAnswers: any): void {
  let vtype: versiontype;
  if (allAnswers[0].IsBreaking === true) {
    vtype = versiontype.major;
  } else {
    if (allAnswers[0].what_changes.includes("Feature: A new feature")) {
      vtype = versiontype.minor;
    } else {
      vtype = versiontype.patch;
    }
  }

  const verWithV: string = bump_package_version(versiontype.patch);
  const verWithoutV: string = verWithV.trim().replace("v", "");
  const history: string = get_readme_formatted_text(allAnswers, verWithoutV);
  update_env_files(verWithoutV);
  update_readme(verWithoutV, allAnswers, history);
  git_checkin(history, verWithoutV);

  console.log(JSON.stringify(allAnswers, null, "  "));
}

function bump_package_version(vertype: versiontype): string {
  let vtype: string = "";

  switch (vertype) {
    case versiontype.major:
      vtype = "major";
      break;
    case versiontype.minor:
      vtype = "minor";
      break;
    case versiontype.patch:
      vtype = "patch";
      break;
    default:
      break;
  }
  let returnval: any;
  returnval = exec("npm version " + vtype);

  // console.log(returnval.toString());

  return returnval.toString();
}

function get_readme_formatted_text(answers: any, _ver: string): string {

  let output: string = "";
  if (answers.length > 2) {
    for (const propt in answers[1]) {
      if (propt !== undefined) {
        switch (propt) {
          case "breaking_info":
            output += os.EOL + "\t\t" + "* [BREACKING CHANGE]" + os.EOL + "\t\t  " + answers[1][propt];
            break;
          case "feature_info":
            output += os.EOL + "\t\t" + "* [NEW FEATURES]" + os.EOL + "\t\t  " + answers[1][propt];
            break;
          case "fix_info":
            output += os.EOL + "\t\t" + "* [FIXES]" + os.EOL + "\t\t  " + answers[1][propt];
            break;
          case "additional_info":
            output += os.EOL + "\t\t" + "* [ADDITIONAL INFO]" + os.EOL + "\t\t  " + answers[1][propt];
            break;
          default:
          // code block
        }
      }
    }
  }

  return output;
}
function update_readme(verstring: string, _answers: any, history: string): void {
  if (fs.existsSync(readmePath)) {


    let readme_file: any = fs.readFileSync(readmePath);

    readme_file = readme_file.toString().replace(/## Versioning[\n\r]*\d*\.\d*.\d*/i, "## Versioning" + os.EOL + os.EOL + verstring);
    // let history = get_readme_formatted_text(answers, verstring);
    readme_file = readme_file.toString().replace(/## Release History[\n\r]*/i, "## Release History" + os.EOL + os.EOL + "* " +
                  verstring + history + os.EOL);

    fs.outputFileSync(readmePath, readme_file, "utf8");
  }
}

function update_env_files(verstring: string): void {
  if (fs.existsSync(envConfigPaths.config_in)) {
    let env_config_file: Buffer = fs.readFileSync(envConfigPaths.config_in);
    envConfigVarIn = JSON.parse(env_config_file.toString());
    envConfigVarIn.prod.prod.version = verstring;
    envConfigVarIn.prod.dev.version = verstring;
    fs.outputFileSync(envConfigPaths.config_in, JSON.stringify(envConfigVarIn), "utf8");
  }
  if (fs.existsSync(envConfigPaths.config_out)) {
    let env_config_file: Buffer = fs.readFileSync(envConfigPaths.config_out);
    envConfigVarIn = env_config_file.toString().replace(/"version":"\d*\.\d*.\d*"/i, "\"version\":\"" + verstring + "\"");
    fs.outputFileSync(envConfigPaths.config_out, envConfigVarIn, "utf8");
  }

}

function git_checkin(history: string, ver: string): void {
  // simpleGit.add("-A -- .");
  //exec("git add -A -- .");
  //exec("git commit --quiet --message=\"" + history + "\" --all");
  //exec("git tag -a " + ver + " -m \"version\"");
  //let git: any = simplegit();
  //git.commit(history);
  //git.addAnnotatedTag(ver, "version");
  let statusSummary = null;
  try {
     statusSummary = simplegit(__dirname).status();
  }
  catch (e) {
     // handle the error
  }
console.log(statusSummary);
  //git.status().then((status: StatusSummary) => { ... })
}

var my_answers: any = [
  {
    "what_changes": [
      "Feature: A new feature",
      "Fix: A bug fix",
      "Style: Cosmetic only changes",
      "Refacturing: Code changes, nether features nor fixes"
    ],
    "IsBreaking": true
  },
  {
    "breaking_info": "adfs asdfasdf adf asdfa dfdfda fadf adf a sf s",
    "feature_info": "asdf dsf dsf  adfaa  fasdfa dsfaas df asdfa s",
    "fix_info": " sdsafdf adffa d a sd f ewr erwe rwer",
    "additional_info": "ewr er we rwe r"
  }
];

function call_cli(): void {
  //shell.cd("c:\\go");
  //shell.exec('cd c:\\go');
  //shell.exec('cd c:\\go', {silent:true}).stdout;
  //Console.log('cd c:\\go');
  //var process=cmd.get('node');

  /*console.log(process.pid);*/
  //cmd.run('cd ..');
  //shell.exit(1);
  //cmd.get(
    //'cd ..',
    /*function(err: any, data: any, _stderr: any){
        console.log('the current dir contains these files :\n\n',data)
    }*/
  //);
  process.stdout.write("cd ..");
}

//call_cli();

run_updates(my_answers);
