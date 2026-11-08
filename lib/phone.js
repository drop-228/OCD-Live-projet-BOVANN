export function normPhone(p=''){let s=String(p).replace(/[^\d+]/g,'');if(s.startsWith('00'))s='+'+s.slice(2);if(s.startsWith('+'))return s;if(s.length===8)return '+228'+s;return '+'+s}
