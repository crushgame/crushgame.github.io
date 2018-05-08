/////////////////////////////////////////////////////////////////////////////////////
// 
//   ORIGINAL
//
/////////////////////////////////////////////////////////////////////////////////////

"use strict";

function ifIsRevealingPage() {
    if (window.location.hash) {
        var hash = window.location.hash.substring(1);
        if (hash.includes("game:")) {
            return true;
        }     
        return false;  
    }
}

if (ifIsRevealingPage()) {
    var hash = window.location.hash.substring(1);
    hash = hash.replace("game:", "");
    var arr = hash.split(",");
    var hashGameId = arr[0];
    var hashSecret = arr[1];
    var hashThrow = arr[2];
    $("#reveal-game-id").val(hashGameId);
    $("#reveal-secret").val(hashSecret);
    $("#reveal-throw").val(hashThrow);
    goToRevealPage();
}

const testContractAddress = "n1juyLVSmixBS4Kn5Xf6i9KKFbbBwJpS6Vs";
const mainContractAddress = "n1xCytMnarntJz6W2qJa5xr24YghggxhUx9";
var contractAddress = mainContractAddress;

var nebulas = require("nebulas"),
    Account = nebulas.Account,
    Utils = nebulas.Utils,
    neb = new nebulas.Neb(),
    globalParams = {
        account: null
    },
    duelAddress = "",
    duelGameId = 0,
    isDueling = false,
    isRevealing = false,
    newGameId = 0,
    validateTab2 = uiBlock.validate("#tab2"),
    validateTab3 = uiBlock.validate("#tab3");
var walletReady = false;

switchToMainnet();

// var net = "https://testnet.nebulas.io";
// setNet(net); // sets the apiPrefix and other chain specific parameters into "localSave"

// neb.setRequest(new nebulas.HttpRequest(localSave.getItem("apiPrefix")));
// refreshDisplay();

uiBlock.insert({
    footer: ".footer",
    header: ".header",
    iconAddress: ".icon-address",
    logoMain: ".logo-main",
    numberComma: ".number-comma",
    selectWalletFile: [".select-wallet-file", onUnlockFile]
});

$("#tabs a").click(function (e) {
    e.preventDefault();
    $("#tabs li").removeClass("ccc");
    $(this).parent().addClass("ccc");
    $("#content div").removeClass("show");
    $("#" + $(this).attr("title")).addClass("show");
    $(this).addClass("current");
});

$("#tabs a").hover(function () {
    if (!$(this).parent().hasClass("current")) {
        $(this).parent().addClass("hoverItem");
    }
}, function () {
    $(this).parent().removeClass("hoverItem");
});


// prompt（function，args） 
$("#prompt").mouseover(function(){
    $("#prompt_contenner").removeClass("active1");
});

$("#prompt").mouseout(function(){
    $("#prompt_contenner").addClass("active1");
});

$("#call_prompt").mouseover(function(){
    $("#call_prompt_contenner").removeClass("active1");
});

$("#call_prompt").mouseout(function(){
    $("#call_prompt_contenner").addClass("active1");
});

    $("#function_prompt").mouseover(function(){
    $("#function_prompt_contenner").removeClass("active1");
});

$("#function_prompt").mouseout(function(){
    $("#function_prompt_contenner").addClass("active1");
});

$(".search").on("click", onClickSearch);
$("#deploy_test").on("click", onClickDeployTest);
$("#deploy").on("click", onClickDeploy);
// $("#call_test").on("click", onClickCallTest);
$("#call").on("click", onClickCall);

function onClickDeployTest() {
    validateTab2() && innerDeploy(function (params) {
        neb.api.call({
            from: params.from,
            to: params.to,
            value: params.value,
            nonce: params.nonce,
            gasPrice: params.gasPrice,
            gasLimit: params.gasLimit,
            contract: params.contract
        }).then(function (resp) {
            $("#deploy_test_result").text(JSON.stringify(resp));
            $("#deploy").attr("disabled", false); // = $('#deploy').removeAttr("disabled")
            $("#deploy_result").text("");
            $("#deploy_test_result").parents(".next").removeClass("active1");
        }).catch(function (err) {
            $("#deploy_test_result").text(JSON.stringify(err));
            $("#deploy").attr("disabled", true);
            $("#deploy_result").text("");
            $("#deploy_test_result").parents(".next").removeClass("active1");
        });
    });
}

function onClickDeploy() {
    $(".modal.loading").modal("show");
    $(".next_right").removeClass("active1");

    innerDeploy(function (params) {
        var gTx = new nebulas.Transaction(parseInt(localSave.getItem("chainId")),
            globalParams.account,
            params.to, params.value, params.nonce, params.gasPrice, params.gasLimit, params.contract);

        gTx.signTransaction();

        neb.api
            .sendRawTransaction(gTx.toProtoString())
            .then(function (resp) {
                $("#deploy_result").text(JSON.stringify(resp));
                $("#deploy_result_address").val(resp.contract_address);
                $("#receipt").text(resp.txhash).prop("href", "check.html?" + resp.txhash);
                $(".modal.loading").modal("hide");
            })
            .catch(function (err) {
                $("#deploy_result").text(JSON.stringify(err));
                $(".modal.loading").modal("hide");
            });
    });
}

function onClickSearch() {
    if ($("#addr_input").val().length != 64) {
        $(".errmsg").removeClass("active1");

        setTimeout(function () {
            $(".errmsg").addClass("active1");
        }, 2000);
    } else {
        $(".modal.loading").modal("show");

        neb.api
            .getTransactionReceipt($("#addr_input").val())
            .then(function (resp) {
                var data, s, lang;

                if (!resp.contract_address || resp.contract_address === "") {
                    bootbox.dialog({
                        backdrop: true,
                        message: i18n.apiErrorToText("transaction not found"),
                        onEscape: true,
                        size: "large",
                        title: "Error"
                    });
                } else {
                    $(".search_result").removeClass("active1");

                    if (resp.data) {
                        data = atob(resp.data);
                        lang = Prism.languages.javascript;

                        if (resp.type == "binary")
                            s = data;
                        else if (resp.type == "deploy")
                            s = Prism.highlight(js_beautify(JSON.parse(data).Source), lang);
                        else if (resp.type == "call")
                            s = Prism.highlight(js_beautify(data), lang);
                        else
                            s = "0x0";

                        $(".search_result").html(s);
                        $(".modal.loading").modal("hide");
                    }
                }
            })
            .catch(function (err) {
                bootbox.dialog({
                    backdrop: true,
                    onEscape: true,
                    message: i18n.apiErrorToText(err.message),
                    size: "large",
                    title: "Error"
                });

                $(".modal.loading").modal("hide");
            });
    }
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
//
// onClickCallTest to test contract call
//
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function onClickCallTest() {
    innerCall(function (params) {
        neb.api
            .call({
                from: params.from,
                to: params.to,
                value: params.value,
                nonce: params.nonce,
                gasPrice: params.gasPrice,
                gasLimit: params.gasLimit,
                contract: params.contract
            })
            .then(function (resp) {
                $("#call_test_result").text(JSON.stringify(resp));
                onClickCall();
                newGameId = resp["result"];
                if (resp.execute_err && resp.execute_err !== "") {
                    $("#call").attr("disabled", true);
                    $("#call_result").text("");
                    $(".next").removeClass("active1");
                } else {
                    $("#call").attr("disabled", false);
                    $("#call_result").text("");
                    $(".next").removeClass("active1");
                }
            })
            .catch(function (err) {
                $("#call_test_result").text(JSON.stringify(err));
                $("#call").attr("disabled", true);
                $("#call_result").text("");
                $(".next").removeClass("active1");
            });
    });
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
//
// onClickCall to submit contract call
//
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function onSubmitThrow() {
    onClickCallTest();
}

function onClickCall() {
    $(".modal.loading").modal("show");

    innerCall(function (params) {
        var gTx = new nebulas.Transaction(parseInt(localSave.getItem("chainId")),
            globalParams.account,
            params.to, params.value, params.nonce, params.gasPrice, params.gasLimit, params.contract);

        gTx.signTransaction();

        neb.api
            .sendRawTransaction(gTx.toProtoString())
            .then(function (resp) {
                console.log(JSON.stringify(resp));
                if (params.isPlayer1or2 == 1) {
                    newGameId = newGameId.replace("\"", "");
                    newGameId = newGameId.replace("\"", "");
                    var cleanUrl = window.location.href.split('#')[0];
                    var url = cleanUrl + "#game:" + newGameId + "," + params.secret + "," + params.throw;
                    showAlert(url, "url");
                    newGameId = 0;
                } else {
                    getGamesList();
                    hideWalletShowGames();
                }
                // showAlert(JSON.stringify(resp));
                // $("#call_result").text(JSON.stringify(resp));
                // $(".result").removeClass("active1");
                // $(".next").removeClass("active1");
                // $("#receipt_call").text(resp.txhash).prop("href", "check.html?" + resp.txhash);
                $(".modal.loading").modal("hide");
            })
            .catch(function (err) {
                console.log(JSON.stringify(err));
                showAlert(JSON.stringify(err));
                // $("#call_result").text(JSON.stringify(err));
                // $(".result").removeClass("active1");
                // $(".next").removeClass("active1");
                // $(".modal.loading").modal("hide");
            });
    });
}


////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
//
// onUnlockFile
//
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function onUnlockFile(swf, fileJson, account, password) {
    var balance_nas, state,
        fromAddr = account.getAddressString(),
        $tab = $(swf).closest(".tab");

    $(".modal.loading").modal("show");

    $("#run_from_addr").val(fromAddr).trigger("input");
    // if ($tab.prop("id") == "tab2") {
    //     $("#from_addr").val(fromAddr).trigger("input");
    //     $("#to_addr").val(account.getAddressString()).trigger("input");
    // } else if ($tab.prop("id") == "tab3")
    //     $("#run_from_addr").val(fromAddr).trigger("input");

    try {
        account.fromKey(fileJson, password);
        globalParams.account = account;
        $("#unlock").hide();
        $("#send").show();

        neb.api.gasPrice()
            .then(function (resp) {
                $("#gas_price").val(resp.gas_price);
                $("#run_gas_price").val(resp.gas_price);
                if (ifIsRevealingPage()) {

                } else {
                    hideWalletShowGames();
                }
                return neb.api.getAccountState(fromAddr);
            })
            .then(function (resp) {
                var balance = nebulas.Unit.fromBasic(resp.balance, "nas");
                console.log("(Account Balance: " + balance + " NAS)");
                $("#run_balance").val(balance + " NAS");
                $(".run_balance").text("(Account Balance: " + balance + " NAS)");
                // if ($tab.prop("id") == "tab2")
                //     $("#balance").val(balance + " NAS");
                // else if ($tab.prop("id") == "tab3")
                //     $("#run_balance").val(balance + " NAS");

                $(".modal.loading").modal("hide");
            })
            .catch(function (e) {
                // this catches e thrown by nebulas.js!neb

                bootbox.dialog({
                    backdrop: true,
                    onEscape: true,
                    message: i18n.apiErrorToText(e.message),
                    size: "large",
                    title: "Error"
                });

                $(".modal.loading").modal("hide");
            });
    } catch (e) {
        // this catches e thrown by nebulas.js!account

        bootbox.dialog({
            backdrop: true,
            onEscape: true,
            message: localSave.getItem("lang") == "en" ? e : "keystore 文件错误, 或者密码错误",
            size: "large",
            title: "Error"
        });

        $(".modal.loading").modal("hide");
    }
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
//
// innerDeploy (Not Needed)
//
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function innerDeploy(callback) {
    let params = {};

    if (!globalParams.account) {
        // TODO 提示钱包信息不正确
        return;
    }

    params.from = globalParams.account.getAddressString();
    params.to = params.from;

    // prepare gasLimit
    let gasLimit = Utils.toBigNumber(0);

    try {
        gasLimit = Utils.toBigNumber($("#gas_limit").val());
    } catch (err) {
        console.log(err);
    }

    if (gasLimit.cmp(Utils.toBigNumber(0)) <= 0) {
        $("#gas_limit").addClass("err");
        setTimeout(function () {
            $("#gas_limit").removeClass("err");
        }, 5000);
        return;
    }

    params.gasLimit = gasLimit.toNumber();

    // prepare gasPrice
    let gasPrice = Utils.toBigNumber(0);

    try {
        gasPrice = Utils.toBigNumber($("#gas_price").val());
    } catch (err) {
        console.log(err);
    }

    if (gasPrice.cmp(Utils.toBigNumber(0)) <= 0) {
        $("#gas_price").addClass("err");
        setTimeout(function () {
            $("#gas_price").removeClass("err");
        }, 5000);
        return;
    }

    params.gasPrice = gasPrice.toNumber();
    params.value = "0";
    params.contract = {
        "source": $("#source").val(),
        "sourceType": $("input[name=sourceType]:checked").val(),
        "args": $("#deploy_args").val().trim()
    };

    // prepare nonce
    neb.api.getAccountState(params.from)
        .then(function (resp) {
            var balance = nebulas.Unit.fromBasic(resp.balance, "nas");

            params.nonce = parseInt(resp.nonce) + 1;
            console.log("(Account Balance: " + balance + " NAS)");
            console.log("(Nonce: " + params.nonce + ")");

            $("#run_balance").val(balance + " NAS");
            $(".run_balance").text("(Account Balance: " + balance + " NAS)");
            // if ($tab.prop("id") == "tab2")
            //     $("#balance").val(balance + " NAS");
            // else if ($tab.prop("id") == "tab3")
            //     $("#run_balance").val(balance + " NAS");

            callback(params);
        })
        .catch(function (err) {
            $(".modal.loading").modal("hide");

            bootbox.dialog({
                backdrop: true,
                onEscape: true,
                message: i18n.apiErrorToText(err.message),
                size: "large",
                title: "Error"
            });
        });
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
//
// innerCall
//
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function innerCall(callback) {
    let params = {};

    ////////////////////////////////////////////////////////////////////////////////
    // prepare from address
    
    if (!globalParams.account) {
        // TODO 提示钱包信息不正确
        return;
    }
    params.from = globalParams.account.getAddressString();


    ////////////////////////////////////////////////////////////////////////////////
    // prepare to address

    // let toAddr = $("#run_to_addr").val().trim();
    // if (!Account.isValidAddress(toAddr)) {
    //     $("#run_to_addr").addClass("err");
    //     setTimeout(function () {
    //         $("#run_to_addr").removeClass("err");
    //     }, 5000);
    //     return;
    // }
    // params.to = toAddr;

    if (!Account.isValidAddress(contractAddress)) {
        $("#run_to_addr").addClass("err");
        setTimeout(function () {
            $("#run_to_addr").removeClass("err");
        }, 5000);
        showAlert("Invalid contract address");
        return;
    }
    params.to = contractAddress;


    ////////////////////////////////////////////////////////////////////////////////
    // prepare gasLimit

    let gasLimit = Utils.toBigNumber(0);
    try {
        gasLimit = Utils.toBigNumber($("#run_gas_limit").val());
    } catch (err) {
        console.log(err);
        showAlert(err);
    }
    if (gasLimit.cmp(Utils.toBigNumber(0)) <= 0) {
        $("#run_gas_limit").addClass("err");
        setTimeout(function () {
            $("#run_gas_limit").removeClass("err");
        }, 5000);
        showAlert("gasLimit error");
        return;
    }
    params.gasLimit = gasLimit.toNumber();


    ////////////////////////////////////////////////////////////////////////////////
    // prepare gasPrice

    let gasPrice = Utils.toBigNumber(0);
    try {
        gasPrice = Utils.toBigNumber($("#run_gas_price").val());
    } catch (err) {
        console.log(err);
        showAlert(err);
    }
    if (gasPrice.cmp(Utils.toBigNumber(0)) <= 0) {
        $("#run_gas_price").addClass("err");
        setTimeout(function () {
            $("#run_gas_price").removeClass("err");
        }, 5000);
        showAlert("gasPrice error");
        return;
    }
    params.gasPrice = gasPrice.toNumber();

    ////////////////////////////////////////////////////////////////////////////////
    // prepare value

    var amountEntered = $("#run_value").val();

    let value = Utils.toBigNumber(0);
    try {
        value = nebulas.Unit.toBasic(Utils.toBigNumber(amountEntered), "nas");
    } catch (err) {
        console.log(err);
        showAlert(err);
    }
    if (value.cmp(Utils.toBigNumber(0)) < 0) {
        // TODO 添加提示value输入不对
        console.log("invalid value");
        showAlert("Invalid amount");
        return;
    }
    params.value = value;

    ////////////////////////////////////////////////////////////////////////////////
    // prepare contract
    
    var player1_choice = $('input[name="choice-options"]:checked').val(); 
    var player1_secret = "" + Math.random(); // "8a9sdu983242";
    var hash_input = player1_choice + player1_secret;
    var player1_encrypted_choice = "" + _hash(hash_input);
    params.isPlayer1or2 = 1;

    var functionToCall = "create_game";
    var argsToCall = JSON.stringify([player1_encrypted_choice, ""]);
    if (isDueling) {
        params.isPlayer1or2 = 2;
        var game_id = duelGameId;
        functionToCall = "join_game";
        argsToCall = JSON.stringify([game_id, player1_choice])
    } else if (isRevealing) {
        functionToCall = "reveal_game";
        var hashGameId = $("#reveal-game-id").val();
        var hashSecret = $("#reveal-secret").val();
        var hashThrow = $("#reveal-throw").val();
        argsToCall = JSON.stringify([hashGameId, hashThrow, hashSecret]);                
    }
    params.contract = {
        "function": functionToCall,
        "args": argsToCall
    };

    // Additional params to pass down
    params.throw = player1_choice;
    params.secret = player1_secret;

    // params.contract = {
    //     "function": $("#call_function").val(),
    //     "args": $("#call_args").val().trim()
    // };        

    // prepare nonce
    // needs refresh data on every 'test' and 'commit' call, because data update may slow,
    // you can get different result by hit 'test' multiple times
    neb.api.getAccountState(params.from).then(function (resp) {
        var balance = nebulas.Unit.fromBasic(resp.balance, "nas");

        params.nonce = parseInt(resp.nonce) + 1;

        $("#run_balance").val(balance + " NAS");
        $(".run_balance").text("(Account Balance: " + balance + " NAS)");
        // if ($tab.prop("id") == "tab2")
        //     $("#balance").val(balance + " NAS");
        // else if ($tab.prop("id") == "tab3")
        //     $("#run_balance").val(balance + " NAS");

        callback(params);
    }).catch(function (err) {
        console.log("prepare nonce error: " + err);
        // bootbox.dialog({
        //     backdrop: true,
        //     onEscape: true,
        //     message: i18n.apiErrorToText(err.message),
        //     size: "large",
        //     title: "Error"
        // });
    });
}


/////////////////////////////////////////////////////////////////////////////////////
// 
//   END ORIGINAL
//
/////////////////////////////////////////////////////////////////////////////////////


$(function() {
    $(document).on('.data-api');
    // Social Media
    var buttons = document.querySelectorAll(".social_share");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function() {
            return JSShare.go(this);
        }, false);
    }  
});

$(".switch-test").on("click", switchToTestnet);
$(".switch-main").on("click", switchToMainnet);

$("#reveal").click(function() {
    showReveal();
});

$(".back-home").click(function() {
    goToHomePage();
});

$(".refresh-games").click(function() {
    getGamesList();
});

$(".start-battle").click(function() {
    createDuel();
});

$("#fight").click(function() {
    onSubmitThrow();
    // Get values
    // var yourWalletAddress = $("#yourWalletAddress").val();
    // var address = $("#address").val();
    // var amount = $("#betAmount").val();
    // var amountInNas;
    // var choice = $('input[name="choice-options"]:checked').val();
});

/////////////////////////////////////////////////////////////////////////////////////
// 
//   getGamesList
//
/////////////////////////////////////////////////////////////////////////////////////

function getGamesList(verifyGameId) {

    // <a data-game-id="123" data-address="982347" class="fight-button btn btn-primary">挑战! Fight!</a>

    var callParamsObj = {
        chainID: parseInt(localSave.getItem("chainId")),
        // chainID: 1001,
        from: "n1EdY7FnXvYqSG9zT68rnbBRfCXiXAVDfss",
        to: contractAddress,
        value: 0,
        // nonce: parseInt(state["nonce"])+1,
        gasPrice: 1000000,
        gasLimit: 200000,
        contract: {
            function: "list_all_games",
            args: "[]",
        }
    };
    console.log("callParamsObj", callParamsObj);
    neb.api.call(callParamsObj).then(function(tx) {
        console.log("getGamesList's full result", tx);
        if (tx && tx["result"] != "") {
            var result = JSON.parse(tx["result"]);
            console.log("getGamesList's result", result);
            $("#rooms .results-container tbody").html("");
            $("#my-games .results-container tbody").html("");
            for (var i=0; i<result.length; i++) {
                var game = result[i];
                var gameId = game["game_room"];
                var gameValue = game["value"];
                var gameAddress = game["player1_address"];
                var gameAddress2 = game["player2_address"];
                console.log("---- GAME " + gameId + " ----")
                console.log("gameAddress 1 and 2", gameAddress, gameAddress2);
                console.log("globalParams address", globalParams.account.getAddressString());
                if (globalParams.account) {
                    var currentAccountAddress = globalParams.account.getAddressString();
                    var challengersHtml = "<span class='badge badge-info'>GAME "+gameId+"</span> " + shortenAddress(gameAddress, currentAccountAddress) + " <span class='badge badge-primary'>vs</span> " + shortenAddress(gameAddress2, currentAccountAddress);
                    var gameState = "";
                    if (gameAddress == currentAccountAddress) {
                        // current player is player 1
                        console.log("current player is player 1");
                        if (game["state"] == 3) {
                            gameState = "Game ended!";
                            if (game["result"] == 1) {  
                                gameState = "Draw game!";
                            } else if (game["result"] == 2) {
                                gameState = "You won! 🎉";
                            } else if (game["result"] == 3 || game["result"] == 4) {
                                gameState = "You lost! 😦";
                            }
                        } else if (game["state"] == 2) {
                            gameState = "Waiting for you to reveal";
                        }  else if (game["state"] == 1) {
                            gameState = "Waiting for Player 2 to join!";
                        }
                        console.log(gameState);
                        var $row = $("<tr>").append(
                            $("<td>", {html: challengersHtml}),
                            $("<td>", {text: gameValue}),
                            $("<td>", {text: gameState}),
                        );
                        $("#my-games .results-container tbody").append($row);
                    } else if (gameAddress2 == currentAccountAddress) {
                        // current player is player 2
                        console.log("current player is player 2");
                        if (game["state"] == 3) {
                            gameState = "Game ended!";
                            if (game["result"] == 1) {  
                                gameState = "Draw game!";
                            } else if (game["result"] == 3 || game["result"] == 4) {
                                gameState = "You won! 🎉";
                            } else if (game["result"] == 2) {
                                gameState = "You lost! 😦";
                            }
                        } else if (game["state"] == 2) {
                            gameState = "Waiting for Player 1 to reveal";
                        }  else if (game["state"] == 1) {
                            console.log("Shouldn't be possible!!!");
                        }
                        var $row = $("<tr>").append(
                            $("<td>", {html: challengersHtml}),
                            $("<td>", {text: gameValue}),
                            $("<td>", {text: gameState}),
                        );
                        $("#my-games .results-container tbody").append($row);
                    } else if (game["state"] == 1) {
                        // if neither are the current player and game is "CREATED"
                        console.log("rest of games");
                        var $row = $("<tr>").append(
                            $("<td>", {html: challengersHtml}),
                            $("<td>", {text: gameValue}),
                            $("<td>").append(
                                $("<a>", {"class": "fight-button btn btn-primary", "data-game-id": gameId, "data-address": gameAddress, "data-amount": gameValue, text: "挑战! Fight!"})
                            ),
                        );
                        $("#rooms .results-container tbody").append($row);
                    } 
                } else {
                    console.log("Login first");
                }
            }
            initFightButtons();
        }
    }).catch((err) => {
        console.log(err);
        showAlert(err);
    });          
}

/////////////////////////////////////////////////////////////////////////////////////
// 
//   end getGamesList
//
/////////////////////////////////////////////////////////////////////////////////////

function initFightButtons() {
    console.log("initFightButtons...");
    $(".fight-button").click(function() {
        var $this = $(this);
        console.log($this);
        var duelAddress = $this.data("address");
        var duelGameId = $this.data("game-id");
        var duelGameAmount = $this.data("amount");
        console.log(duelAddress, duelGameId, duelGameAmount);
        joinDuel(duelAddress, duelGameId, duelGameAmount);
    });
}

function resetIsDueling() {
    isDueling = false;
    duelAddress = "";
    duelGameId = 0;
}

function joinDuel(duelAddress, duelGameId, duelGameAmount) {
    //TODO: (tarun) Use the duel address
    isDueling = true;
    $(".create-duel-label").hide();
    $(".duel-label").show();
    setDuelAddress(duelAddress);
    setDuelGameId(duelGameId);
    $("#run_value").val(nebulas.Unit.fromBasic(duelGameAmount, "nas"));
    goToBattlePage();
}

function createDuel() {
    $(".create-duel-label").show();
    $(".duel-label").hide();
    goToBattlePage();
    resetIsDueling();
}

function setDuelGameId(gameId) {
    $(".duel-game-id").html(gameId);
    duelGameId = gameId;
}

function setDuelAddress(address) {
    $(".duel-address").html(shortenAddress(address));
    duelAddress = address;
}

function duel(address) {
    $(".duel-address").html(shortenAddress(address));
    $(".duel-label").show();
}

function hideWalletShowGames() {
    goToHomePage();
    $("#wallet").hide();
    walletReady = true;
    getGamesList();
}

function goToRevealPage() {
    $(".page").hide();
    $("#reveal").show();
    $(".main-page").hide();
    $("#main").show();
    $("#wallet").show();
}

function showReveal() {
    if (globalParams && globalParams.account) {
        console.log("------ REVEAL ------");
        var hashGameId = $("#reveal-game-id").val();
        var hashSecret = $("#reveal-secret").val();
        var hashThrow = $("#reveal-throw").val();
        console.log(arr, hashGameId, hashSecret, hashThrow);
        var argsToCall = JSON.stringify([hashGameId, hashThrow, hashSecret]);
        var callParamsObj = {
            chainID: parseInt(localSave.getItem("chainId")),
            // chainID: 1001,
            from: globalParams.account.getAddressString(),
            to: contractAddress,
            value: 0,
            // nonce: parseInt(state["nonce"])+1,
            gasPrice: 1000000,
            gasLimit: 200000,
            contract: {
                function: "reveal_game",
                args: argsToCall,
            }
        };
        console.log("callParamsObj", callParamsObj);
        neb.api.call(callParamsObj).then(function(tx) {
            // if (tx && tx["result"] != "" && !tx["result"].toLowerCase().includes("Error")) {
            //     var result = JSON.parse(tx["result"]);
            //     var gameResult = JSON.parse(result["result"]);
            //     console.log(tx, result, gameResult);
            //     if (gameResult == 1) {
            //         showAlert("DRAW!");
            //     } else if (gameResult == 2) {
            //         if (globalParams.account.getAddressString() == result["player1_address"]) {
            //             goToResultsPage(true);
            //         } else {
            //             goToResultsPage(false);
            //         }
            //         console.log("Player 1 wins!");
            //     } else if (gameResult == 3) {
            //         if (globalParams.account.getAddressString() == result["player2_address"]) {
            //             goToResultsPage(true);
            //         } else {
            //             goToResultsPage(false);
            //         }
            //         console.log("Player 2 wins!");
            //     } else if (gameResult == 4) {
            //         if (globalParams.account.getAddressString() == result["player2_address"]) {
            //             goToResultsPage(true);
            //         } else {
            //             goToResultsPage(false);
            //         }
            //         console.log("Player 2 wins because Player 1 didn't reveal");
            //     } else if (gameResult == 0) {
            //         console.log("Game is still going on...");
            //     }
            // }

            isRevealing = true;
            innerCall(function (params) {
                var gTx = new nebulas.Transaction(parseInt(localSave.getItem("chainId")),
                    globalParams.account,
                    params.to, params.value, params.nonce, params.gasPrice, params.gasLimit, params.contract);

                gTx.signTransaction();

                neb.api
                    .sendRawTransaction(gTx.toProtoString())
                    .then(function (resp) {
                        isRevealing = false;
                        console.log(JSON.stringify(resp));
                        getGamesList();
                        setTimeout(function () {
                            getGamesList();
                        }, 2000);

                        goToHomePage();
                        showAlert("Check whether you won under My Games!");
                    })
                    .catch(function (err) {
                        isRevealing = false;
                        console.log(JSON.stringify(err));
                        showAlert(JSON.stringify(err));
                    });
            });   

        }).catch((err) => {
            console.log(err);
            showAlert(err);
        });       
    } else {
        showAlert("Select your wallet first");
    }

}

function saveData() {
    //TODO: (tarun) SAVE SECRET OR OTHER DATA
    //Cookies.set('name', 'value');
}

function getData() {
    //TODO: (tarun) SAVE SECRET OR OTHER DATA
    //Cookies.get('name');
}

function goToHomePage() {
    $(".page").hide();
    $("#main").show();
    $(".main-page").show();
}

function goToBattlePage() {
    $(".page").hide();
    $("#vs").show();
}

function goToWaitingPage() {
    $(".page").hide();
    $("#waiting").show();
}

function goToResultsPage(win) {
    // var win = true; //Assume win is true for testing
    // Display results
    $(".page").hide();
    $("#results").show();
    $(".results-win").toggle(win);
    $(".results-lost").toggle(!win);
}

function showAlert(message, alertType) {
    if (alertType && alertType == "url") {
        $('#alert .modal-title').text("Copy URL");
        $('#alert .alert-content').html(
            "<p>Copy the url to use it later! You need to reveal when a challenger challenges you!</p><a target='_blank' class='btn btn-primary btn-lg' href='"+message+"'>Reveal Page</a>" 
        );
    } else {
        $('#alert .modal-title').text("Error");
        $('#alert .alert-content').html(message);
    }
    $('#alert').modal({"backdroup": true});
}

function _hash(input) {
    var hash = 0;
    if (input.length === 0) return hash;
    for (var i = 0; i < input.length; i++) {
        var char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    return hash;
}

function shortenAddress(address, currentAddress) {
    if (typeof address === 'string' && address.length > 20) {
        var length = 5;
        if (currentAddress == address) {
            return "You";
        }
        return address.substring(0, length) + "..." + address.substring(address.length-length);
    }
    return "👻";
}

function switchNet(net) {
    setNet(net); // sets the apiPrefix and other chain specific parameters into "localSave"
    neb.setRequest(new nebulas.HttpRequest(localSave.getItem("apiPrefix")));
    // getGamesList();
}

function switchToTestnet() {
    console.log("Switching to testnet");
    contractAddress = testContractAddress;
    switchNet("https://testnet.nebulas.io");
}

function switchToMainnet() {
    console.log("Switching to mainnet");
    contractAddress = mainContractAddress;
    switchNet("https://mainnet.nebulas.io");
}

function setNet(net) {
    var i, len, apiList, langList,
        apiPrefix, sApiButtons, sApiText,
        lang, sLangButtons;

    localSave.setItem("apiPrefix", net)

    apiList = [
        { chainId: 1, name: "Mainnet", url: "https://mainnet.nebulas.io" },
        { chainId: 1001, name: "Testnet", url: "https://testnet.nebulas.io" },
        { chainId: 100, name: "Local Nodes", url: "http://127.0.0.1:8685"}
    ];
    apiPrefix = (localSave.getItem("apiPrefix") || "").toLowerCase();
    sApiButtons = "";

    for (i = 0, len = apiList.length; i < len && apiList[i].url != apiPrefix; ++i);

    i == len && (i = 0);
    localSave.setItem("apiPrefix", apiPrefix = apiList[i].url);
    localSave.setItem("chainId", apiList[i].chainId);
    sApiText = apiList[i].name;

    for (i = 0, len = apiList.length; i < len; ++i)
        sApiButtons += '<button class="' +
            (apiPrefix == apiList[i].url ? "active " : "") + 'dropdown-item" data-i=' + i + ">" +
            apiList[i].name + "</button>";
    //
    // lang

    langList = i18n.supports();
    lang = (localSave.getItem("lang") || "").toLowerCase();
    sLangButtons = "";

    for (i = 0, len = langList.length; i < len && langList[i] != lang; ++i);

    i == len && (i = 0);
    localSave.setItem("lang", lang = langList[i]);
}



/////////////////////////////////////////////////////////////////////////////////////
// 
//   Confetti
//
/////////////////////////////////////////////////////////////////////////////////////

let W = window.innerWidth;
let H = window.innerHeight;
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const maxConfettis = 50;
const particles = [];

const possibleColors = [
    "DodgerBlue",
    "OliveDrab",
    "Gold",
    "Pink",
    "SlateBlue",
    "LightBlue",
    "Gold",
    "Violet",
    "PaleGreen",
    "SteelBlue",
    "SandyBrown",
    "Chocolate",
    "Crimson"
];

function randomFromTo(from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
}

function confettiParticle() {
    this.x = Math.random() * W; // x
    this.y = Math.random() * H - H; // y
    this.r = randomFromTo(11, 33); // radius
    this.d = Math.random() * maxConfettis + 11;
    this.color =
    possibleColors[Math.floor(Math.random() * possibleColors.length)];
    this.tilt = Math.floor(Math.random() * 33) - 11;
    this.tiltAngleIncremental = Math.random() * 0.07 + 0.05;
    this.tiltAngle = 0;

    this.draw = function() {
        context.beginPath();
        context.lineWidth = this.r / 2;
        context.strokeStyle = this.color;
        context.moveTo(this.x + this.tilt + this.r / 3, this.y);
        context.lineTo(this.x + this.tilt, this.y + this.tilt + this.r / 5);
        return context.stroke();
    };
}

function Draw() {
    const results = [];

    // Magical recursive functional love
    requestAnimationFrame(Draw);

    context.clearRect(0, 0, W, window.innerHeight);

    for (var i = 0; i < maxConfettis; i++) {
    results.push(particles[i].draw());
    }

    let particle = {};
    let remainingFlakes = 0;
    for (var i = 0; i < maxConfettis; i++) {
    particle = particles[i];

    particle.tiltAngle += particle.tiltAngleIncremental;
    particle.y += (Math.cos(particle.d) + 3 + particle.r / 2) / 2;
    particle.tilt = Math.sin(particle.tiltAngle - i / 3) * 15;

    if (particle.y <= H) remainingFlakes++;

    // If a confetti has fluttered out of view,
    // bring it back to above the viewport and let if re-fall.
    if (particle.x > W + 30 || particle.x < -30 || particle.y > H) {
        particle.x = Math.random() * W;
        particle.y = -30;
        particle.tilt = Math.floor(Math.random() * 10) - 20;
    }
    }

    return results;
}

window.addEventListener(
    "resize",
    function() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    },
    false
);

// Push new confetti objects to `particles[]`
for (var i = 0; i < maxConfettis; i++) {
    particles.push(new confettiParticle());
}

// Initialize
canvas.width = W;
canvas.height = H;
Draw();

setInterval(function(){
    if (walletReady) {
        getGamesList();
    }
}, 5000);

// 