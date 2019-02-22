#!/usr/bin/env node
declare let inquirer: any;
declare const fs: any;
declare let exec: any;
declare const simpleGit: any;
declare let env_config_paths: any;
declare let readme_path: string;
declare let env_config_var: any;
declare let env_config_var_in: any;
declare let all_answers: any;
declare enum versiontype {
    major = 0,
    minor = 1,
    patch = 2
}
declare function bump_package_version(vertype: versiontype): string;
declare function update_readme(verstring: string): void;
declare function update_env_files(verstring: string): void;
declare function git_checkin(checkindata: any): void;
