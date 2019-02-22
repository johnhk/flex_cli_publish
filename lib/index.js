#!/usr/bin/env node
"use strict";
exports.__esModule = true;
var inquirer = require('inquirer');
var fs = require("fs-extra");
var exec = require('child_process').execSync;
var path = require('path');
var simpleGit = require('simple-git')(__dirname);
//var os = require("os");
//import * as simplegit from 'simple-git/promise';
var os = require("os");
var env_config_paths = { config_in: "./enviroment.config.json", config_out: "./enviroment/enviroment.ts" };
var readme_path = "./readme.md";
var env_config_var;
var env_config_var_in;
var all_answers = [];
var versiontype;
(function (versiontype) {
    versiontype[versiontype["major"] = 0] = "major";
    versiontype[versiontype["minor"] = 1] = "minor";
    versiontype[versiontype["patch"] = 2] = "patch";
})(versiontype || (versiontype = {}));
/*
inquirer
  .prompt([
    {
      type: 'checkbox',
      message: 'what changes',
      name: 'what_changes',
      choices: [
        new inquirer.Separator(' = Select Changes = '),
        {
          name: 'Feature: A new feature'
        },
        {
          name: 'Fix: A bug fix'
        },
        {
          name: 'Doc: Documentation only changes'
        },
        {
          name: 'Style: Cosmetic only changes'
        },
        {
            name: 'Refacturing: Code changes, nether features nor fixes'
        },
          {
            name: 'Performance: Code changes that improves performance'
          },
          {
            name: 'Test: Adding missing tests'
          },
          {
            name: 'Enviroment: Changes to the build process, auxiliary tools or libraries'
          }
      ],
      validate: function(answer: { length: number; }) {
        if (answer.length < 1) {
          return 'You must choose at least 1 change.';
        }

        return true;
      }
    },
    {
        type: 'confirm',
        name: 'IsBreaking',
        message: "Is this breaking changes?",
        default: 'n',
        choices: [
          {
            key: 'y',
            name: 'yes',
            value: 'yes'
          },
          {
            key: 'n',
            name: 'no',
            value: 'no'
          }
        ]
    }
  ])
  .then((answers: any) => {
    all_answers.push(answers);
    let prompt_array: any = [];

    if(all_answers[0].IsBreaking == true) {
      prompt_array.push({
        type: 'input',
        name: 'breaking_info',
        message: "Add bracking change description(s)"
      });
    }

    all_answers[0].what_changes.forEach( function (val:string) {
      let mystr = val.substr(0, 3);
      switch(mystr) {
        case 'Fea':
          prompt_array.push({
            type: 'input',
            name: 'feature_info',
            message: "Add feature description(s)"
          });
        break;
        case 'Fix':
          prompt_array.push({
            type: 'input',
            name: 'fix_info',
            message: "Add fix description(s)"
          });

        break;
        case 'Env':
          prompt_array.push({
            type: 'input',
            name: 'env_info',
            message: "Add Enviromental change description(s)"
          });
        break;
        default:
        // code block
      }
      }
    )

    prompt_array.push({
      type: 'input',
      name: 'additional_info',
      message: "Any additional info"
    });


    inquirer
      .prompt(prompt_array).then((next_answers: any) => {
      all_answers.push(next_answers);

      run_updates(all_answers);
    })



    //console.log(JSON.stringify(answers, null, '  '));
  });
*/
function run_updates(all_answers) {
    var vtype;
    if (all_answers[0].IsBreaking == true) {
        vtype = versiontype.major;
    }
    else {
        if (all_answers[0].what_changes.includes('Feature: A new feature')) {
            vtype = versiontype.minor;
        }
        else {
            vtype = versiontype.patch;
        }
    }
    var ver_with_v = bump_package_version(versiontype.patch);
    var ver_without_v = ver_with_v.trim().replace("v", "");
    var history = get_readme_formatted_text(all_answers, ver_without_v);
    update_env_files(ver_without_v);
    update_readme(ver_without_v, all_answers, history);
    git_checkin(history, ver_without_v);
    console.log(JSON.stringify(all_answers, null, '  '));
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
    returnval = exec('npm version ' + vtype);
    //console.log(returnval.toString());
    return returnval.toString();
}
function get_readme_formatted_text(answers, ver) {
    var output = "";
    for (var propt in answers[1]) {
        switch (propt) {
            case 'breaking_info':
                output += os.EOL + "\t\t" + "* [BREACKING CHANGE]" + os.EOL + "\t\t  " + answers[1][propt];
                break;
            case 'feature_info':
                output += os.EOL + "\t\t" + "* [NEW FEATURES]" + os.EOL + "\t\t  " + answers[1][propt];
                break;
            case 'fix_info':
                output += os.EOL + "\t\t" + "* [FIXES]" + os.EOL + "\t\t  " + answers[1][propt];
                break;
            case 'additional_info':
                output += os.EOL + "\t\t" + "* [ADDITIONAL INFO]" + os.EOL + "\t\t  " + answers[1][propt];
                break;
            default:
            // code block
        }
        console.log(propt + ': ' + answers[1][propt]);
    }
    return output;
}
function update_readme(verstring, answers, history) {
    if (fs.existsSync(readme_path)) {
        var readme_file = fs.readFileSync(readme_path);
        readme_file = readme_file.toString().replace(/## Versioning[\n\r]*\d*\.\d*.\d*/i, '## Versioning' + os.EOL + os.EOL + verstring);
        // let history = get_readme_formatted_text(answers, verstring);
        readme_file = readme_file.toString().replace(/## Release History[\n\r]*/i, '## Release History' + os.EOL + os.EOL + "* " + verstring + history + os.EOL);
        fs.outputFileSync(readme_path, readme_file, "utf8");
    }
}
function update_env_files(verstring) {
    if (fs.existsSync(env_config_paths.config_in)) {
        var env_config_file = fs.readFileSync(env_config_paths.config_in);
        env_config_var_in = JSON.parse(env_config_file.toString());
        env_config_var_in.prod.prod.version = verstring;
        env_config_var_in.prod.dev.version = verstring;
        fs.outputFileSync(env_config_paths.config_in, JSON.stringify(env_config_var_in), "utf8");
    }
    if (fs.existsSync(env_config_paths.config_out)) {
        var env_config_file = fs.readFileSync(env_config_paths.config_out);
        env_config_var_in = env_config_file.toString().replace(/"version":"\d*\.\d*.\d*"/i, '"version":"' + verstring + '"');
        fs.outputFileSync(env_config_paths.config_out, env_config_var_in, "utf8");
    }
}
function git_checkin(history, ver) {
    simpleGit.commit(history);
    simpleGit.addAnnotatedTag(ver, "version");
}
var assdaaf;
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
run_updates(my_answers);
