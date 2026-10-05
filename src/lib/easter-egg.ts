// Easter egg: quem abre o F12 (ou "Inspecionar") encontra o Tico no console.
// Só texto no console: não mexe na tela, no progresso nem no servidor.

export const TICO_ASCII = `⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⡶⣶⣄⠀⠀⢀⣀⣤⣤⡤⠶⠶⠶⠶⠶⠶⠶⣤⣤⣀⣰⣿⢻⡻⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢺⣷⡹⣜⣽⡷⠟⠋⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠿⣷⣽⡿⠁⠀⠀⠀⣠⣄⡀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣷⡿⠉⠀⠀⠀⠀⠀⠀⢀⠠⠈⠀⡀⠁⠀⠁⠀⠁⠠⠀⠀⠉⢿⣄⠀⠀⠀⢸⡏⢈⢿⠞⠻⣦
⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⠏⠀⠀⠀⠀⠀⢀⠀⠂⠀⢀⠀⠂⠀⠐⠈⠀⡀⠂⠠⠈⡀⠁⠀⢻⣆⠀⠀⠘⣷⣀⠂⣌⣵⠏
⠀⠀⠀⠀⠀⠀⠀⠀⢠⡟⠀⠀⠀⠀⠀⠃⠀⢀⠀⠃⠀⠀⠄⠃⠀⠄⠀⢀⠀⢃⠠⠀⢘⡀⠀⢿⡄⠀⠀⠘⢿⠿⠟⠃⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣼⠁⠀⣤⣤⣤⡁⠀⡀⠄⢀⠂⣡⣞⣟⣻⢻⢶⣬⡀⠀⠂⢠⣾⣿⡿⠇⠘⢷⣄⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣴⠏⠀⠀⠙⠛⠿⠿⠀⠀⠠⣴⡻⣝⢮⣎⢷⣫⢞⣶⣻⢧⡐⠈⠉⠀⣄⠠⣄⢢⡹⣦⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣼⠃⠐⡆⣧⢰⡆⠀⠀⢀⠈⢸⡷⣽⣿⡷⣎⢷⡹⢮⡿⣿⢫⣧⠀⢁⠂⠘⢃⠙⠂⡁⢹⡆⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢠⡟⠀⠀⠁⠈⠀⠁⠀⠠⠀⠠⢸⣷⡹⢶⣹⢮⡳⣏⢷⣹⢎⡿⣹⠀⠄⠠⠁⡀⠂⠐⡀⠌⣿⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢸⡇⠀⠀⠀⠀⠠⠐⠀⠀⠌⠀⢸⣧⣛⢧⣛⢮⢷⣹⡞⣽⡺⡽⣽⠀⠂⢁⠠⠐⠈⠄⡀⠂⣿⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠘⣧⠀⠠⠁⠀⠄⠀⡀⠈⠀⠐⢸⣧⣛⢮⡝⣯⢞⣿⡽⣖⣻⢵⣻⠀⠂⠄⡀⠂⢁⠐⢀⣸⡏⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠹⣦⠀⢀⠂⠀⡀⠀⢀⠈⠀⠈⣷⡭⣗⣿⣼⣿⠟⢿⣷⣿⢎⡿⠀⠈⠄⠠⠁⢂⠈⣴⠟⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣠⣿⢷⣤⡐⠀⢀⠐⠀⠀⠂⠁⠻⣵⣏⡞⣿⡇⠀⠂⣿⣏⡾⠃⠠⠁⡈⠄⢂⣤⡾⠋⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢰⣾⠛⠀⠈⠛⠿⣶⠀⠀⡁⠐⠀⡐⠈⠙⠛⣻⡇⠀⠅⣿⣉⣀⡠⠁⠐⡀⠄⠛⢉⣟⠂⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣸⡟⠁⢀⠀⠂⠠⠀⠀⠠⠐⠀⢠⣥⡶⠿⠛⠛⢻⡇⠀⠀⣿⠙⠛⠛⠛⠻⢶⡄⠂⡀⢹⡳⠂⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣴⠏⠀⢀⠂⠀⣼⣃⡀⣥⠀⠂⠈⢾⣇⡀⠀⠀⠀⠘⠷⠶⠶⠟⠀⠀⠀⢀⣀⣼⣿⢠⠀⠘⣿⠒⠀⠀⠀⠀⠀⠀
⠀⠀⣼⠏⠀⢠⡄⠀⠄⠉⠙⠳⠋⠀⠐⠿⣾⣏⡛⠛⠷⠶⠶⠶⠶⠶⠶⠾⠟⠛⢛⣉⣴⣿⠟⠁⠠⢹⡇⠀⠀⠀⠀⠀⠀
⠀⣰⡏⠀⠠⡟⠀⠄⠂⠈⠀⠄⠐⣈⠀⠄⠈⢻⣿⣿⡶⣶⣶⣶⣶⣶⡶⡶⢾⠿⣿⣿⣯⠀⠀⣤⣷⠈⣿⠀⠀⠀⠀⠀⠀
⠚⣫⡤⠀⢁⠀⢰⡆⠀⠁⡀⠂⠈⢛⠿⣦⣔⡾⣽⣿⡿⡐⡔⣂⠖⡰⢢⢙⠢⡍⢿⣿⣞⣷⡾⠋⢀⠀⢻⡆⠀⠀⠀⠀⠀
⠘⣫⡤⠀⠂⢀⠘⠁⠀⠂⠀⠄⠁⢙⢻⣦⠙⢻⣿⠟⠁⠑⠸⠴⠬⠥⠧⠎⠓⠊⠉⣽⡏⢁⠀⢀⠂⠠⠘⣷⠀⠀⠀⠀⠀
⠘⢩⡗⠀⢸⡇⠀⠈⠀⡄⠁⢠⠀⠘⣷⣿⠂⠘⣿⠀⠀⢰⣶⣶⡄⠀⠀⣤⣶⣤⠁⢺⡇⢸⡆⣶⢸⡆⢰⡟⠀⠀⠀⠀⠀
⠐⢿⡇⠠⠘⠃⠠⠈⢀⠀⠄⠀⠄⠂⠹⣷⠀⠈⣿⠀⠀⠻⠿⠿⠁⣀⡀⠿⣿⡿⠀⣼⡇⠈⡙⠉⢋⠠⣼⠃⠀⠀⠀⠀⠀
⠀⠸⠷⣷⡀⠡⠀⠂⡀⠄⠂⢈⠠⠐⠀⣿⠇⠀⣿⣰⣿⣿⡆⠀⣾⣿⣿⠀⠀⢀⠰⢸⡇⢀⠐⠈⣤⣾⠃⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠈⠷⣤⡈⠐⠀⠠⣈⣤⣤⣤⣂⡿⠀⠂⣿⡇⠉⢉⣤⣦⡄⠉⠁⢴⣿⣿⢀⢸⣇⣤⣾⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠈⠛⠳⠾⣿⡿⣿⣻⣿⣿⡷⠶⠶⣽⣧⣀⡘⠻⠿⠃⠀⠀⠈⢛⣉⣴⠾⠙⠿⠿⠛⠛⠉⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⠛⠛⠋⠉⠀⠀⠀⠀⠈⠉⠛⠛⠛⠛⠛⠛⠛⠋⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`;

const RECADO = [
  'Psiu! Você achou o Tico nos bastidores. 👀',
  'Enquanto você inspeciona o código, ele inspeciona o edital: já leu cada linha duas vezes e grifou as pegadinhas da banca.',
  'Dica do Tico: curiosidade é o melhor começo de estudo. Agora fecha o F12 e vem resolver umas questões comigo! 📚',
];

let mostrado = false;

export function mostrarTicoNoConsole(saida: Pick<Console, 'log'> = console): void {
  if (mostrado) return;
  mostrado = true;
  try {
    saida.log(`%c${TICO_ASCII}`, 'font-family: monospace; line-height: 1.1;');
    saida.log(`%c${RECADO[0]}`, 'font-size: 16px; font-weight: bold; color: #1688e8;');
    saida.log(`%c${RECADO.slice(1).join('\n')}`, 'font-size: 13px;');
  } catch {
    // Console indisponível: o easter egg é só um enfeite, o app segue normal.
  }
}

export function resetEasterEggForTests(): void {
  mostrado = false;
}
