import * as dgram from 'dgram';

// FiveM RCON – Quake3 out-of-band UDP protokoll
// FiveM nem Source Engine RCON-t használ, hanem a Q3 "rcon" parancsot UDP-n
export function fivemRcon(host: string, port: number, password: string, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    let responded = false;
    let fullResponse = '';

    // Q3 out-of-band packet: 0xFFFFFFFF + "rcon <password> <command>\n"
    const header = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
    const body = Buffer.from(`rcon ${password} ${command}\n`, 'utf8');
    const packet = Buffer.concat([header, body]);

    const timeout = setTimeout(() => {
      if (!responded) {
        socket.close();
        resolve('OK (no response - command may have executed)');
      }
    }, 5000);

    socket.on('message', (msg: Buffer) => {
      responded = true;
      clearTimeout(timeout);
      const response = msg.toString('utf8');
      const content = response.replace(/^\xFF{4}print\n/, '').trim();
      fullResponse += content;
      
      setTimeout(() => {
        socket.close();
        resolve(fullResponse || 'OK');
      }, 500);
    });

    socket.on('error', (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });

    socket.send(packet, 0, packet.length, port, host, (err) => {
      if (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

