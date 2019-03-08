#!/usr/bin/env node
"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
var fs = __importStar(require("fs-extra"));
var inquirer = __importStar(require("inquirer"));
var os = __importStar(require("os"));
//import * as cmd from 'node-cmd';
//import * as simplegit from "simple-git"
var simplegit = require("simple-git");
//import simplegit from "simple-git/promise";
var envConfigPaths = { config_in: "./enviroment.config.json", config_out: "./enviroment/enviroment.ts" };
var readmePath = "./readme.md";
var envConfigVar;
var envConfigVarIn;
var allAnswers = [];
var versiontype;
(function (versiontype) {
    versiontype[versiontype["major"] = 0] = "major";
    versiontype[versiontype["minor"] = 1] = "minor";
    versiontype[versiontype["patch"] = 2] = "patch";
})(versiontype || (versiontype = {}));
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
            validate: function (answer) {
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
        .then(function (answers) {
        allAnswers.push(answers);
        var prompt_array = [];
        if (allAnswers[0].IsBreaking == true) {
            prompt_array.push({
                type: "input",
                name: "breaking_info",
                message: "Add bracking change description(s)"
            });
        }
        allAnswers[0].what_changes.forEach(function (val) {
            var mystr = val.substr(0, 3);
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
        });
        prompt_array.push({
            type: "input",
            name: "additional_info",
            message: "Any additional info"
        });
        inquirer
            .prompt(prompt_array).then(function (next_answers) {
            allAnswers.push(next_answers);
            run_updates(allAnswers);
        });
    });
}
function run_updates(allAnswers) {
    var vtype;
    if (allAnswers[0].IsBreaking === true) {
        vtype = versiontype.major;
    }
    else {
        if (allAnswers[0].what_changes.includes("Feature: A new feature")) {
            vtype = versiontype.minor;
        }
        else {
            vtype = versiontype.patch;
        }
    }
    var verWithV = bump_package_version(versiontype.patch);
    var verWithoutV = verWithV.trim().replace("v", "");
    var history = get_readme_formatted_text(allAnswers, verWithoutV);
    update_env_files(verWithoutV);
    update_readme(verWithoutV, allAnswers, history);
    git_checkin(history, verWithoutV);
    console.log(JSON.stringify(allAnswers, null, "  "));
}
function bump_package_version(vertype) {
    var vtype = "";
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
    var returnval;
    returnval = child_process_1.execSync("npm version " + vtype);
    // console.log(returnval.toString());
    return returnval.toString();
}
function get_readme_formatted_text(answers, _ver) {
    var output = "";
    if (answers.length > 2) {
        for (var propt in answers[1]) {
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
function update_readme(verstring, _answers, history) {
    if (fs.existsSync(readmePath)) {
        var readme_file = fs.readFileSync(readmePath);
        readme_file = readme_file.toString().replace(/## Versioning[\n\r]*\d*\.\d*.\d*/i, "## Versioning" + os.EOL + os.EOL + verstring);
        // let history = get_readme_formatted_text(answers, verstring);
        readme_file = readme_file.toString().replace(/## Release History[\n\r]*/i, "## Release History" + os.EOL + os.EOL + "* " +
            verstring + history + os.EOL);
        fs.outputFileSync(readmePath, readme_file, "utf8");
    }
}
function update_env_files(verstring) {
    if (fs.existsSync(envConfigPaths.config_in)) {
        var env_config_file = fs.readFileSync(envConfigPaths.config_in);
        envConfigVarIn = JSON.parse(env_config_file.toString());
        envConfigVarIn.prod.prod.version = verstring;
        envConfigVarIn.prod.dev.version = verstring;
        fs.outputFileSync(envConfigPaths.config_in, JSON.stringify(envConfigVarIn), "utf8");
    }
    if (fs.existsSync(envConfigPaths.config_out)) {
        var env_config_file = fs.readFileSync(envConfigPaths.config_out);
        envConfigVarIn = env_config_file.toString().replace(/"version":"\d*\.\d*.\d*"/i, "\"version\":\"" + verstring + "\"");
        fs.outputFileSync(envConfigPaths.config_out, envConfigVarIn, "utf8");
    }
}
function git_checkin(history, ver) {
    // simpleGit.add("-A -- .");
    var result = child_process_1.execSync("git add -A -- .");
    console.log(result.toString());
    //exec("git commit --quiet --message=\"" + history + "\" --all");
    //exec("git tag -a " + ver + " -m \"version\"");
    //let git: any = simplegit();
    //git.commit(history);
    //git.addAnnotatedTag(ver, "version");
    /*let statusSummary = null;
    try {
       statusSummary = simplegit(__dirname).status();
    }
    catch (e) {
       // handle the error
    }
  console.log(statusSummary);
  */
    //git.status().then((status: StatusSummary) => { ... })
}
var my_answers = [
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
function call_cli() {
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
//git_checkin('history', '1');
//# sourceMappingURL=index.js.map