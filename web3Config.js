export const MONAD_TESTNET = {
    chainId: "0x279f",
    chainName: "Monad Testnet",
    rpcUrls: ["https://testnet-rpc.monad.xyz"],
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    blockExplorerUrls: ["https://testnet.monadexplorer.com"],
};

export const CONTRACT_ADDRESS = "0x12A322c1C44CD5b90f4BE8E13F2e75BbAAb96799";

export const CONTRACT_ABI = [
    {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"participant","type":"address"},{"indexed":false,"internalType":"string","name":"newAlias","type":"string"}],"name":"AliasUpdated","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"raffleNumber","type":"uint256"}],"name":"RaffleStarted","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"participant","type":"address"},{"indexed":false,"internalType":"uint256","name":"quantity","type":"uint256"},{"indexed":false,"internalType":"string","name":"_alias","type":"string"}],"name":"TicketPurchased","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"TicketPriceUpdated","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"winner","type":"address"},{"indexed":false,"internalType":"uint256","name":"raffleNumber","type":"uint256"}],"name":"WinnerDrawn","type":"event"},
    {"inputs":[{"internalType":"string","name":"_alias","type":"string"}],"name":"buyTicket","outputs":[],"stateMutability":"payable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_quantity","type":"uint256"},{"internalType":"string","name":"_alias","type":"string"}],"name":"buyTickets","outputs":[],"stateMutability":"payable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_quantity","type":"uint256"},{"internalType":"string","name":"_newAlias","type":"string"}],"name":"buyTicketsWithNewAlias","outputs":[],"stateMutability":"payable","type":"function"},
    {"inputs":[],"name":"drawWinner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_participant","type":"address"}],"name":"getAlias","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"getContractBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"getParticipants","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"getPastWinners","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_participant","type":"address"}],"name":"getTicketCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"isRaffleOpen","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"raffleCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"refundParticipants","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"startRaffle","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_newPrice","type":"uint256"}],"name":"setTicketPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"ticketPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"string","name":"_newAlias","type":"string"}],"name":"updateAlias","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"stateMutability":"payable","type":"receive"}
];
