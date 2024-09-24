// ==UserScript==
// @name         Flower Gitadora Score Exporter
// @version      0.1
// @description  Export Gitadora scores from Flower. Based off a script by blobdash, Meta-link and Humanbomb.
// @author       nebbii
// @match        https://projectflower.eu/game/gitadora/*
// @exclude      https://projectflower.eu/game/gitadora/*/scores
// @exclude      https://projectflower.eu/game/gitadora/*/custom
// @exclude      https://projectflower.eu/game/gitadora/*/players
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
    const gametype = GM_SuperValue.get("gametype", 0);

    if(exporting){
        getScores(1, gametype);
    }
    else
    {
        GM_SuperValue.set("scores", 0);
    }

    addExportButton("Export page (Gita)", () => {
        getScores(0, "Gita");
    });
    addExportButton("Export all pages (Gita)", () => {
        getScores(1, "Gita");
    });
    addExportButton("Export page (Dora)", () => {
        getScores(0, "Dora");
    });
    addExportButton("Export all pages (Dora)", () => {
        getScores(1, "Dora");
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

function getScores(goToNextPage, gametype) {
    const scoreLines = document.querySelectorAll(".table > tbody:nth-child(3) > tr");
    let scores = [];

    const superScores = GM_SuperValue.get("scores", 0);
    if(superScores != 0){
        superScores.forEach(score =>  scores.push(score));
    }

    //const clearMedalFromImgId = ["failedUnknown","failedCircle","failedDiamond","failedStar","easyClear","clearCircle","clearDiamond","clearStar","fullComboCircle","fullComboDiamond","fullComboStar","perfect"];


    for(var i = 0; i < scoreLines.length; i += 2) {
        const url         = scoreLines[i].querySelector("td:nth-child(2) > a").getAttribute("href");
        const split       = url.split("/");
        const id          = split[split.length-3]
        let difficulty    = Number(split[split.length-1]) // 1 = basic, 2 = advanced, 3 = extreme, 4 = master
        const playtype    = Number(split[split.length-2]) // 0 = drums, 1 = guitar, 2 = bass
        if (gametype == "Dora" && [1, 2].includes(playtype)) { continue; }
        if (gametype == "Gita" && playtype == 0) { continue; }

        const percent     = parseFloat(scoreLines[i].querySelector("td:nth-child(5) > small").innerHTML.trim());
        const lamp        = scoreLines[i].querySelector("td:nth-child(6) > strong").innerHTML.trim().toUpperCase();
        const timeTxt     = scoreLines[i].querySelector("td:nth-child(7) > div > small").innerHTML.trim()
        const time        = moment(timeTxt, "YYYY-MM-DD h:mm A").unix() * 1000;

        const judgements  = scoreLines[i+1].querySelector("td div > div").querySelectorAll('.col-sm-2')
        const perfect     = Number(judgements[0].innerHTML.split("<br>")[1])
        const great       = Number(judgements[1].innerHTML.split("<br>")[1])
        const good        = Number(judgements[2].innerHTML.split("<br>")[1])
        const ok          = Number(judgements[3].innerHTML.split("<br>")[1])
        const miss        = Number(judgements[4].innerHTML.split("<br>")[1])

        switch(difficulty) {
            case 1:
                difficulty = "BASIC";
                break;
            case 2:
                difficulty = "ADVANCED";
                break;
            case 3:
                difficulty = "EXTREME";
                break;
            case 4:
                difficulty = "MASTER";
                break;
        }

        if (gametype == "Gita" && playtype == 2) { 
            difficulty = "BASS " + difficulty
        }

        // judgments from strings to ints
        // percent can be a float
        // lamp needs to get retrieved
        // 
        const scoreJson = {
            "percent": percent,
            "lamp": lamp,
            "matchType": "inGameID",
            "identifier": id,
            "difficulty": difficulty,
            "timeAchieved": time,
            "judgements": {
                "perfect": perfect,
                "great": great,
                "good": good,
                "ok": ok,
                "miss": miss
            }
        };

        scores.push(scoreJson)
    }

    if(goToNextPage == 0){
        exportScores(scores, gametype);
    }
    else{
        const pages = document.querySelectorAll("ul[class='pagination'] > li");
        if(pages[pages.length-1].classList.contains('disabled')){
            exportScores(scores, gametype);
            GM_SuperValue.set("scores", 0);
            GM_SuperValue.set("exporting", 0);
            GM_SuperValue.set("gametype", gametype);
        }
        else{
            GM_SuperValue.set("scores", scores);
            GM_SuperValue.set("exporting", 1);
            GM_SuperValue.set("gametype", gametype);
            document.querySelectorAll("li > a[rel='next']")[1].click();
        }
    }
}

function exportScores(scores, gametype){
    const json = {
            "meta": {
                "game": "gitadora",
                "playtype": gametype,
                "service": "FLO Gitadora Music Exporter"
            },
            scores: scores
    };
    var file = new Blob([JSON.stringify(json)], {type: "text/plain;charset=utf-8"});
    saveAs(file, "gd-export-" + Date.now() + ".json");
}
