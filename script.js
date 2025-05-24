import { MONAD_TESTNET, CONTRACT_ADDRESS, CONTRACT_ABI } from './web3Config.js';

let web3, contract, userAddress, isWalletConnected = false, isConnecting = false, isProcessing = false;
let xUsername = "";
let acceptedCookies = false;
let cache = { data: null, timestamp: 0, validDuration: 60000 };
let privy;

async function init() {
    try {
        console.log("Inicializando Web3 com RPC público...");
        web3 = new Web3(new Web3.providers.HttpProvider(MONAD_TESTNET.rpcUrls[0]));
        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        console.log("Contrato inicializado:", CONTRACT_ADDRESS);
    } catch (error) {
        console.error("Erro ao inicializar Web3:", error);
        showErrorPopup("Erro ao conectar ao contrato. Tente novamente mais tarde.");
        return;
    }

    // Inicializar Privy
    privy = new Privy({
        appId: 'cmawsprsj04etld0ml7e41ycf',
        config: {
            loginMethods: ['wallet'],
            embeddedWallets: { createOnLogin: 'users-without-wallets' },
            supportedChains: [
                {
                    chainId: parseInt(MONAD_TESTNET.chainId, 16),
                    name: MONAD_TESTNET.chainName,
                    rpcUrl: MONAD_TESTNET.rpcUrls[0],
                }
            ],
        }
    });

    // Restaurar sessão
    if (Cookies.get("userAddress")) {
        try {
            const { user } = await privy.getUser();
            if (user && user.wallet) {
                userAddress = user.wallet.address;
                isWalletConnected = true;
                xUsername = Cookies.get("xUsername") || "";
                web3 = new Web3(user.wallet.provider);
                contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
                document.getElementById("walletButton").innerText = `Carteira: ${truncateAddress(userAddress)}`;
                document.getElementById("userAddress").innerText = userAddress;
                document.getElementById("xUsernameDisplay").innerText = xUsername || "Não definido";
            } else {
                Cookies.remove("userAddress");
                Cookies.remove("xUsername");
            }
        } catch (error) {
            console.error("Erro ao restaurar sessão:", error);
            Cookies.remove("userAddress");
            Cookies.remove("xUsername");
        }
    }

    // Event Listeners
    document.getElementById("walletButton").addEventListener("click", debounce(connectWallet, 500));
    document.getElementById("disconnectWallet").addEventListener("click", disconnectWallet);
    document.getElementById("buyTickets").addEventListener("click", debounce(handleBuyTickets, 500));
    document.getElementById("ticketQuantity").addEventListener("input", updateTotalCost);
    document.getElementById("acceptCookies").addEventListener("click", acceptCookies);
    document.getElementById("closeErrorPopup").addEventListener("click", () => hidePopup("errorPopup"));
    document.getElementById("closeThanksPopup").addEventListener("click", () => hidePopup("thanksPopup"));
    document.getElementById("submitUsername").addEventListener("click", submitTwitterUsername);
    setupImage3DEffect();
    setupMenuCloseListener();
    if (!Cookies.get("acceptedCookies") && !acceptedCookies) {
        document.getElementById("cookieConsent").style.display = "block";
        document.getElementById("popupOverlay").style.display = "block";
    }
    await updateUI();
    setInterval(updateUI, 10000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function connectWallet() {
    if (isConnecting) {
        showErrorPopup("Uma solicitação de conexão está pendente. Por favor, aguarde.");
        return;
    }
    isConnecting = true;
    console.log("Tentando conectar carteira via Privy...");
    try {
        const { user } = await privy.login();
        if (!user || !user.wallet) {
            showErrorPopup("Falha ao conectar a carteira. Tente novamente.");
            return;
        }
        userAddress = user.wallet.address;
        web3 = new Web3(user.wallet.provider);
        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        console.log("Carteira conectada:", userAddress);
        const chainId = await web3.eth.getChainId();
        if (chainId !== parseInt(MONAD_TESTNET.chainId, 16)) {
            console.log("Trocando para Monad Testnet...");
            try {
                await user.wallet.switchChain(parseInt(MONAD_TESTNET.chainId, 16));
            } catch (switchError) {
                if (switchError.code === 4902) {
                    console.log("Adicionando Monad Testnet...");
                    await user.wallet.addChain({
                        chainId: parseInt(MONAD_TESTNET.chainId, 16),
                        chainName: MONAD_TESTNET.chainName,
                        rpcUrls: MONAD_TESTNET.rpcUrls,
                        nativeCurrency: MONAD_TESTNET.nativeCurrency,
                        blockExplorerUrls: MONAD_TESTNET.blockExplorerUrls,
                    });
                } else {
                    console.error("Erro ao trocar de rede:", switchError);
                    throw switchError;
                }
            }
        }
        isWalletConnected = true;
        document.getElementById("walletButton").innerText = `Carteira: ${truncateAddress(userAddress)}`;
        document.getElementById("walletMenu").classList.add("hidden");
        document.getElementById("userAddress").innerText = userAddress;
        Cookies.set("userAddress", userAddress, { expires: 7 });
        if (!xUsername) {
            showUsernamePopup();
        } else {
            document.getElementById("xUsernameDisplay").innerText = xUsername;
        }
        updateBuyButton();
        await updateUI();
    } catch (error) {
        console.error("Erro ao conectar Privy:", error);
        showErrorPopup("Erro ao conectar a carteira. Tente novamente.");
    } finally {
        isConnecting = false;
    }
}

function disconnectWallet() {
    privy.logout();
    userAddress = null;
    isWalletConnected = false;
    xUsername = "";
    Cookies.remove("userAddress");
    Cookies.remove("xUsername");
    web3 = new Web3(new Web3.providers.HttpProvider(MONAD_TESTNET.rpcUrls[0]));
    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
    document.getElementById("walletButton").innerText = "Conectar Carteira";
    document.getElementById("walletButton").classList.remove("disabled-button");
    document.getElementById("walletButton").classList.add("action-button");
    document.getElementById("walletMenu").classList.add("hidden");
    document.getElementById("userAddress").innerText = "";
    document.getElementById("xUsernameDisplay").innerText = "";
    document.getElementById("walletBalance").innerText = "0 MON";
    updateBuyButton();
    cache = { data: null, timestamp: 0, validDuration: 60000 };
    updateUI();
}

function normalizeXUsername(username) {
    return username.startsWith("@") ? username : `@${username}`;
}

function isValidXUsername(username) {
    const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
    return cleanUsername.length > 0 && /^[a-zA-Z0-9_]+$/.test(cleanUsername);
}

function showUsernamePopup() {
    document.getElementById("twitterUsernameInput").value = xUsername || "";
    document.getElementById("usernamePopup").style.display = "block";
    document.getElementById("popupOverlay").style.display = "block";
}

function submitTwitterUsername() {
    const username = document.getElementById("twitterUsernameInput").value;
    if (!isValidXUsername(username)) {
        showErrorPopup("Insira um username válido do X (ex.: @username, apenas letras, números e sublinhados).");
        return;
    }
    xUsername = normalizeXUsername(username);
    Cookies.set("xUsername", xUsername, { expires: 7 });
    document.getElementById("xUsernameDisplay").innerText = xUsername;
    hidePopup("usernamePopup");
}

function truncateAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function updateTotalCost() {
    const inputValue = document.getElementById("ticketQuantity").value;
    const quantityError = document.getElementById("ticketQuantityError");
    let quantity = parseFloat(inputValue);
    if (!inputValue || isNaN(quantity) || quantity < 1 || !Number.isInteger(quantity)) {
        quantityError.classList.remove("hidden");
        quantity = 1;
    } else {
        quantityError.classList.add("hidden");
        quantity = Math.floor(quantity);
    }
    let ticketPrice;
    if (cache.data && Date.now() - cache.timestamp < cache.validDuration) {
        ticketPrice = cache.data.ticketPrice;
    } else {
        try {
            ticketPrice = await retryCall(() => contract.methods.ticketPrice().call());
            cache.data = cache.data || {};
            cache.data.ticketPrice = ticketPrice;
            cache.timestamp = Date.now();
        } catch (error) {
            console.error("Erro ao obter ticketPrice:", error);
            ticketPrice = "0";
        }
    }
    const total = web3.utils.toBN(quantity).mul(web3.utils.toBN(ticketPrice));
    document.getElementById("totalCost").innerText = web3.utils.fromWei(total, "ether");
}

async function updateWalletBalance() {
    if (!userAddress || !isWalletConnected) {
        document.getElementById("walletBalance").innerText = "0 MON";
        return;
    }
    try {
        const balance = await web3.eth.getBalance(userAddress);
        document.getElementById("walletBalance").innerText = `${parseFloat(web3.utils.fromWei(balance, "ether")).toFixed(2)} MON`;
    } catch (error) {
        console.error("Erro ao obter saldo:", error);
        document.getElementById("walletBalance").innerText = "Erro";
    }
}

async function retryCall(callFn, maxRetries = 5, baseDelay = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await callFn();
        } catch (error) {
            console.error(`Tentativa ${attempt} falhou:`, error);
            if (error.message.includes("429") || error.message.includes("request limit reached")) {
                if (attempt === maxRetries) {
                    console.error("Limite de requisições atingido.");
                    throw new Error("Limite de requisições atingido. Tente novamente mais tarde.");
                }
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.warn(`Erro 429, tentando novamente após ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

function updateBuyButton(isRaffleOpen = true) {
    const buyButton = document.getElementById("buyTickets");
    const raffleStatus = document.getElementById("raffleStatus");
    if (!isWalletConnected) {
        buyButton.innerText = "Conecte sua wallet primeiro";
        buyButton.disabled = true;
        buyButton.classList.remove("action-button");
        buyButton.classList.add("disabled-button");
        buyButton.onclick = null;
        raffleStatus.classList.add("hidden");
    } else if (!isRaffleOpen) {
        buyButton.innerText = "Comprar Tickets";
        buyButton.disabled = true;
        buyButton.classList.remove("action-button");
        buyButton.classList.add("disabled-button");
        buyButton.onclick = null;
        raffleStatus.classList.remove("hidden");
    } else {
        buyButton.innerText = "Comprar Tickets";
        buyButton.disabled = false;
        buyButton.classList.remove("disabled-button");
        buyButton.classList.add("action-button");
        buyButton.onclick = debounce(handleBuyTickets, 500);
        raffleStatus.classList.add("hidden");
    }
}

async function handleBuyTickets() {
    if (isProcessing) {
        showProcessingPopup();
        return;
    }
    if (!isWalletConnected) {
        showErrorPopup("Conecte sua carteira primeiro.");
        return;
    }
    isProcessing = true;
    showProcessingPopup();
    try {
        const isRaffleOpen = await retryCall(() => contract.methods.isRaffleOpen().call());
        if (!isRaffleOpen) {
            showErrorPopup("O sorteio está fechado.");
            return;
        }
        const alias = xUsername;
        const quantity = Math.floor(parseFloat(document.getElementById("ticketQuantity").value));
        if (isNaN(quantity) || quantity < 1 || !Number.isInteger(quantity)) {
            showErrorPopup("Quantidade de tickets inválida. Insira um número inteiro maior ou igual a 1.");
            return;
        }
        if (!alias || !isValidXUsername(alias)) {
            showErrorPopup("Username do X inválido. Insira um username válido.");
            return;
        }
        const ticketPrice = await retryCall(() => contract.methods.ticketPrice().call());
        const totalValue = web3.utils.toBN(quantity).mul(web3.utils.toBN(ticketPrice)).toString();
        console.log("Enviando transação de compra...", { userAddress, quantity, totalValue, alias });
        const tx = await contract.methods.buyTickets(quantity, alias).send({
            from: userAddress,
            value: totalValue
        });
        console.log("Transação bem-sucedida:", tx);
        showThanksPopup();
        cache = { data: null, timestamp: 0, validDuration: 60000 };
        await updateUI();
    } catch (error) {
        console.error("Erro ao comprar tickets:", error);
        showErrorPopup("Erro ao processar a compra de tickets. Tente novamente.");
    } finally {
        isProcessing = false;
        hidePopup("processingPopup");
    }
}

function setupMenuCloseListener() {
    let isMouseOverButton = false, isMouseOverMenu = false;
    const walletButton = document.getElementById("walletButton");
    const walletMenu = document.getElementById("walletMenu");
    walletButton.addEventListener("mouseenter", () => {
        isMouseOverButton = true;
        if (isWalletConnected) {
            walletMenu.classList.remove("hidden");
            console.log("Menu aberto (mouseenter no botão)");
        }
    });
    walletButton.addEventListener("mouseleave", () => {
        isMouseOverButton = false;
        console.log("Mouse saiu do botão");
    });
    walletMenu.addEventListener("mouseenter", () => {
        isMouseOverMenu = true;
        console.log("Mouse sobre o menu");
    });
    walletMenu.addEventListener("mouseleave", () => {
        isMouseOverMenu = false;
        console.log("Mouse saiu do menu");
    });
    document.addEventListener("mousemove", (e) => {
        if (!isMouseOverButton && !isMouseOverMenu && !walletButton.contains(e.target) && !walletMenu.contains(e.target)) {
            walletMenu.classList.add("hidden");
            console.log("Menu fechado (mouse fora)");
        }
    });
}

function showErrorPopup(message) {
    console.log("Exibindo erro:", message);
    document.getElementById("errorMessage").innerText = message;
    document.getElementById("errorPopup").style.display = "block";
    document.getElementById("popupOverlay").style.display = "block";
}

function showProcessingPopup() {
    document.getElementById("processingPopup").style.display = "block";
    document.getElementById("popupOverlay").style.display = "block";
}

function showThanksPopup() {
    document.getElementById("thanksPopup").style.display = "block";
    document.getElementById("popupOverlay").style.display = "block";
}

function hidePopup(popupId) {
    document.getElementById(popupId).style.display = "none";
    if (document.getElementById("errorPopup").style.display !== "block" &&
        document.getElementById("processingPopup").style.display !== "block" &&
        document.getElementById("thanksPopup").style.display !== "block" &&
        document.getElementById("usernamePopup").style.display !== "block" &&
        document.getElementById("cookieConsent").style.display !== "block") {
        document.getElementById("popupOverlay").style.display = "none";
    }
}

function acceptCookies() {
    acceptedCookies = true;
    Cookies.set("acceptedCookies", "true", { expires: 365 });
    hidePopup("cookieConsent");
}

function setupImage3DEffect() {
    const image = document.getElementById("sorteioImage");
    const imageRect = image.getBoundingClientRect();
    image.addEventListener("mousemove", (e) => {
        const x = e.clientX - imageRect.left;
        const y = e.clientY - imageRect.top;
        const centerX = imageRect.width / 2;
        const centerY = imageRect.height / 2;
        const maxTilt = 20;
        const tiltX = ((centerY - y) / centerY) * maxTilt;
        const tiltY = ((x - centerX) / centerX) * maxTilt;
        image.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });
    image.addEventListener("mouseleave", () => {
        image.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    });
}

async function updateUI() {
    try {
        let ticketPrice = "0", ticketCount = 0, participants = [], isRaffleOpen = false;
        if (cache.data && Date.now() - cache.timestamp < cache.validDuration) {
            ({ ticketPrice, ticketCount, participants, isRaffleOpen } = cache.data);
        } else {
            try {
                console.log("Lendo ticketPrice...");
                ticketPrice = await retryCall(() => contract.methods.ticketPrice().call());
            } catch (error) {
                console.error("Erro ao ler ticketPrice:", error);
            }
            try {
                console.log("Lendo participantes...");
                participants = await retryCall(() => contract.methods.getParticipants().call());
            } catch (error) {
                console.error("Erro ao ler participantes:", error);
            }
            try {
                console.log("Lendo status do sorteio...");
                isRaffleOpen = await retryCall(() => contract.methods.isRaffleOpen().call());
            } catch (error) {
                console.error("Erro ao ler isRaffleOpen:", error);
            }
            if (userAddress && isWalletConnected) {
                try {
                    console.log("Lendo ticketCount para:", userAddress);
                    ticketCount = await retryCall(() => contract.methods.getTicketCount(userAddress).call());
                } catch (error) {
                    console.error("Erro ao ler ticketCount:", error);
                }
            }
            cache.data = { ticketPrice, ticketCount, participants, isRaffleOpen };
            cache.timestamp = Date.now();
        }
        document.getElementById("ticketPrice").innerText = ticketPrice === "0" ? "0.2" : web3.utils.fromWei(ticketPrice, "ether");
        document.getElementById("participantCount").innerText = participants.length;
        document.getElementById("ticketCount").innerText = isWalletConnected ? ticketCount : "Conecte sua Wallet";
        if (isWalletConnected) {
            await updateTotalCost();
            await updateWalletBalance();
            updateBuyButton(isRaffleOpen);
        } else {
            document.getElementById("walletBalance").innerText = "0 MON";
            document.getElementById("totalCost").innerText = ticketPrice === "0" ? "0.2" : web3.utils.fromWei(ticketPrice, "ether");
            updateBuyButton(isRaffleOpen);
        }
        const participantsList = document.getElementById("participantsList");
        const participantData = [];
        const uniqueParticipants = [...new Set(participants)];
        for (let i = 0; i < Math.min(uniqueParticipants.length, 5); i++) {
            const participant = uniqueParticipants[i];
            if (!web3.utils.isAddress(participant)) continue;
            let alias = "Desconhecido";
            let count = 0;
            try {
                alias = await retryCall(() => contract.methods.getAlias(participant).call());
                count = await retryCall(() => contract.methods.getTicketCount(participant).call());
            } catch (error) {
                console.error(`Erro ao obter dados do participante ${participant}:`, error);
            }
            participantData.push({ address: participant, alias, count });
        }
        participantData.sort((a, b) => b.count - a.count);
        participantsList.innerHTML = "";
        participantData.forEach(({ address, alias, count }, i) => {
            const li = document.createElement("li");
            li.setAttribute("data-rank", i + 1);
            li.innerText = `${truncateAddress(address)} (${alias}): ${count} tickets`;
            participantsList.appendChild(li);
        });
        document.getElementById("participantsSection").style.display = participantData.length > 0 ? "block" : "none";
    } catch (error) {
        console.error("Erro ao atualizar UI:", error);
    }
}

window.onload = init;
