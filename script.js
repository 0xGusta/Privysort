import { MONAD_TESTNET, CONTRACT_ADDRESS, CONTRACT_ABI } from './web3Config.js';

let web3, contract, userAddress, isWalletConnected = false, isConnecting = false, isProcessing = false;
let xUsername = "";
let acceptedCookies = false;
let cache = { data: null, timestamp: 0, validDuration: 60000 };
let privy;

async function init() {
    console.log("Inicializando aplicativo...");

    // Inicializar Web3 com RPC público
    try {
        web3 = new Web3(new Web3.providers.HttpProvider(MONAD_TESTNET.rpcUrls[0]));
        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        console.log("Web3 inicializado com sucesso:", CONTRACT_ADDRESS);
    } catch (error) {
        console.error("Erro ao inicializar Web3:", error);
        showErrorPopup("Erro ao conectar ao contrato. Tente novamente mais tarde.");
        return;
    }

    // Inicializar Privy
    try {
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
        console.log("Privy inicializado com sucesso");
    } catch (error) {
        console.error("Erro ao inicializar Privy:", error);
        showErrorPopup("Erro ao inicializar o sistema de autenticação. Tente novamente.");
        return;
    }

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
                console.log("Sessão restaurada:", userAddress);
            } else {
                Cookies.remove("userAddress");
                Cookies.remove("xUsername");
                console.log("Sessão inválida, cookies removidos");
            }
        } catch (error) {
            console.error("Erro ao restaurar sessão:", error);
            Cookies.remove("userAddress");
            Cookies.remove("xUsername");
        }
    }

    // Configurar Event Listeners
    try {
        document.getElementById("walletButton").addEventListener("click", debounce(connectWallet, 500));
        document.getElementById("disconnectWallet").addEventListener("click", disconnectWallet);
        document.getElementById("buyTickets").addEventListener("click", debounce(handleBuyTickets, 500));
        document.getElementById("ticketQuantity").addEventListener("input", updateTotalCost);
        document.getElementById("acceptCookies").addEventListener("click", acceptCookies);
        document.getElementById("closeErrorPopup").addEventListener("click", () => hidePopup("errorPopup"));
        document.getElementById("closeThanksPopup").addEventListener("click", () => hidePopup("thanksPopup"));
        document.getElementById("submitUsername").addEventListener("click", submitTwitterUsername);
        console.log("Event listeners configurados com sucesso");
    } catch (error) {
        console.error("Erro ao configurar event listeners:", error);
        showErrorPopup("Erro ao configurar os botões. Tente recarregar a página.");
    }

    // Configurar efeitos e UI inicial
    setupImage3DEffect();
    setupMenuCloseListener();
    if (!Cookies.get("acceptedCookies") && !acceptedCookies) {
        document.getElementById("cookieConsent").style.display = "block";
        document.getElementById("popupOverlay").style.display = "block";
        console.log("Popup de cookies exibido");
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
    console.log("Carteira desconectada");
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
    console.log("Popup de username exibido");
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
    console.log("Username submetido:", xUsername);
}

function truncateAddress(address) {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
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
            console.log("Preço do ticket atualizado:", ticketPrice);
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
        document.get
