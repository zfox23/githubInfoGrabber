const { Octokit } = require("@octokit/core");
const requestData = require('./requestData.json');
const fs = require('fs');

const octokit = new Octokit({ auth: requestData.GITHUB_ACCESS_TOKEN });

function getPRDataForPage(options) {
    return new Promise((resolve, reject) => {
        let retObj = {
            "responseContainedData": false,
            "prData": [],
            "error": undefined
        };
    
        octokit.request(`GET /repos/{owner}/{repo}/pulls?state=all&sort=updated&direction=desc&page=${options.pageNum || 1}&per_page=${options.perPage || 100}`, {
            owner: requestData.owner,
            repo: requestData.repo
        })
            .then((response) => {
                if (response.data.length > 0) {
                    retObj.responseContainedData = true;
                }

                response.data.forEach((pull) => {
                    if (!requestData.usernameFilter || requestData.usernameFilter === pull.user.login) {
                        retObj.prData.push(pull);
                    }
                });

                resolve(retObj);
            })
            .catch((error) => {
                retObj.error = error;
                reject(retObj);
            });
    });
}

async function getPRData(options) {
    console.log(`Getting PR data from GitHub associated with \`${requestData.owner}/${requestData.repo}\`...`);
    if (requestData.usernameFilter) {
        console.log(`Applying Username Filter \`${requestData.usernameFilter}\`...`);
    }

    let currentPRTitlesPageNum = 1;
    let PRData = [];
    let response;
    do {
        console.log(`Getting page ${currentPRTitlesPageNum}...`);
        response = await getPRDataForPage({
            "pageNum": currentPRTitlesPageNum++,
            "perPage": options.perPage || 100
        });
        if (response.error) {
            console.error(`Error obtaining data from GitHub:\n${repsonse.error}`);
        } else {
            PRData = PRData.concat(response.prData);
        }
    } while (options.paginate && response.responseContainedData && !response.error);

    console.log(`Finished getting PR data!\n`);

    console.log(`Simplifying output data...`);
    let dataForFile = {
        "numPRs": PRData.length,
        "repoOwner": requestData.owner,
        "repo": requestData.repo,
        "usernameFilter": requestData.usernameFilter,
        "prData": PRData
    };
    const wantedKeys = ['merged_at', 'title'];
    dataForFile.prData.forEach((pr) => {
        Object.keys(pr).forEach((key) => wantedKeys.includes(key) || delete pr[key]);
    })
    console.log(`Done simplifying output data!\n`);

    let timestamp = Date.now();
    let outputFilename = `./output/${timestamp}_${requestData.owner}-${requestData.repo}_prData.json`;
    console.log(`Writing PR data to \`${outputFilename}\`...`);
    fs.writeFileSync(outputFilename, JSON.stringify(dataForFile, undefined, 4));
    console.log(`Done writing PR data to file!\n`);
}

getPRData({
    "paginate": true,
    "perPage": 100
});