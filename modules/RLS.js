var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from RLS module
function parse_out(data) {
  switch (data.msg[0]) {
    case 0x58: // Broadcast: Headlight wipe interval
      data.command = 'bro';
      data.value   = 'headlight wipe interval '+data.msg;
      break;

    default:
      data.command = 'unk';
      data.value   = Buffer.from(data.msg);
  }

  log.bus(data);
}

module.exports = {
  parse_out : (data) => { parse_out(data); },
};
