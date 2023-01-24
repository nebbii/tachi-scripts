// ==UserScript==
// @name         Flower pop'n Score Exporter
// @version      0.1
// @description  Export pop'n scores from Flower. Based off a script by Meta-link and Humanbomb.
// @author       blobdash
// @match        https://projectflower.eu/game/pnm/*
// @exclude      https://projectflower.eu/game/pnm/*/scores
// @exclude      https://projectflower.eu/game/pnm/*/custom
// @exclude      https://projectflower.eu/game/pnm/*/players
// @icon         https://www.google.com/s2/favicons?sz=64&domain=projectflower.eu
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.11.2/moment.js
// @require      https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.min.js
// @require      http://userscripts-mirror.org/scripts/source/107941.user.js
// @grant GM_setValue
// @grant GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    const exporting = GM_SuperValue.get("exporting", 0);
    if(exporting){
        getScores(1);
    }
    else
    {
        GM_SuperValue.set("scores", 0);
    }

    addExportButton("Export page", () => {
        getScores(0);
    });
    addExportButton("Export all pages", () => {
        getScores(1);
    });
})();

function addExportButton(text, onclick) {
    const button = document.createElement('button');
    button.setAttribute("class", "btn btn-primary");
    button.setAttribute("id", "export-score-button");
    button.innerHTML = text;
    button.onclick = onclick;
    button.style.margin = "0 10px";

    document.getElementsByClassName("page-header")[1].appendChild(button);
}

function getScores(goToNextPage) {
    const scoreLines = document.querySelectorAll(".table > tbody:nth-child(3) > tr");
    let scores = [];

    const superScores = GM_SuperValue.get("scores", 0);
    if(superScores != 0){
        superScores.forEach(score =>  scores.push(score));
    }

    const clearMedalFromImgId = ["failedUnknown","failedCircle","failedDiamond","failedStar","easyClear","clearCircle","clearDiamond","clearStar","fullComboCircle","fullComboDiamond","fullComboStar","perfect"];


    for(var i = 0; i < scoreLines.length; i += 2) {
        if(scoreLines[i].querySelector("td:nth-child(2)").innerText.split("\n")[0].search("BATTLE") == -1) {
            const url = scoreLines[i].querySelector("td:nth-child(1) > a").getAttribute("href");
            const split = url.split("/");
            const id = split[split.length-2]
            let difficulty = scoreLines[i].querySelector("td:nth-child(2)").innerText.split("\n")[1]
            const clearImageId = Number(scoreLines[i].querySelector("td:nth-child(3) > img").getAttribute("src").replace("https://cdn.projectflower.eu/pnm/grades/pnm_lamp_popn_", "").replace(".png", ""));
            const score = Number(scoreLines[i].querySelector("td:nth-child(4) > div").innerHTML);
            const clearMedal = clearMedalFromImgId[clearImageId];
            const timeTxt = scoreLines[i].querySelector("td:nth-child(6) > small:nth-child(2)").innerHTML.trim();
            const time = moment(timeTxt, "YYYY-MM-DD h:mm A").unix() * 1000;

            const cool = Number(scoreLines[i+1].querySelector("td:nth-child(1) > div > div > div:nth-child(7)").innerHTML.trim().replace('<strong>Cool</strong><br>', ''));
            const great = Number(scoreLines[i+1].querySelector("td:nth-child(1) > div > div > div:nth-child(8)").innerHTML.trim().replace('<strong>Great</strong><br>', ''));
            const good = Number(scoreLines[i+1].querySelector("td:nth-child(1) > div > div > div:nth-child(9)").innerHTML.trim().replace('<strong>Good</strong><br>', ''));
            const bad = Number(scoreLines[i+1].querySelector("td:nth-child(1) > div > div > div:nth-child(10)").innerHTML.trim().replace('<strong>Bad</strong><br>', ''));

            switch(difficulty) {
                case 'EASY':
                    difficulty = "Easy";
                    break;
                case 'NORMAL':
                    difficulty = "Normal";
                    break;
                case 'HYPER':
                    difficulty = "Hyper";
                    break;
            }

            const scoreJson = {
                "score": score,
                "matchType": "inGameID",
                "identifier": id,
                "difficulty": difficulty,
                "timeAchieved": time,
                "judgements": {
                    "bad": bad,
                    "good": good,
                    "great": great,
                    "cool": cool
                },
                "optional": {
                    "clearMedal": clearMedal
                }
            };

            scores.push(scoreJson)
        }
    }

    if(goToNextPage == 0){
        exportScores(scores);
    }
    else{
        const pages = document.querySelectorAll("ul[class='pagination'] > li");
        if(pages[pages.length-1].classList.contains('disabled')){
            exportScores(scores);
            GM_SuperValue.set("scores", 0);
            GM_SuperValue.set("exporting", 0);
        }
        else{
            GM_SuperValue.set("scores", scores);
            GM_SuperValue.set("exporting", 1);
            document.querySelectorAll("li > a[rel='next']")[1].click();
        }
    }
}

function exportScores(scores){
    const json = {
            "meta": {
                "game": "popn",
                "playtype": "9B",
                "service": "FLO pop'n Music Exporter"
            },
            scores: scores
    };
    var file = new Blob([JSON.stringify(json)], {type: "text/plain;charset=utf-8"});
    saveAs(file, "popn-export-" + Date.now() + ".json");
}