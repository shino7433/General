function estimate(opts) {
  opts = opts || {};
  var evalCount = Number(opts.evalCount || 0);
  var size = opts.size || 'small';
  var stage = evalCount <= 2 ? 'low' : (evalCount <= 9 ? 'mid' : 'high');
  var table = {
    small:  { low: '5,000〜10,000円',  mid: '10,000〜20,000円', high: '15,000〜25,000円' },
    medium: { low: '10,000〜20,000円', mid: '20,000〜40,000円', high: '30,000〜50,000円' },
    large:  { low: '30,000〜50,000円', mid: '40,000〜60,000円', high: '50,000〜80,000円' },
  };
  var hours = { small: '2〜4h', medium: '4〜8h', large: '8〜16h' };
  return { '見積': table[size][stage], '想定実稼働': hours[size] };
}

if (typeof module !== 'undefined') {
  module.exports = { estimate: estimate };
}
