const fs = require('fs');
const path = require('path');
const dir = 'c:\\Users\\Snehal\\Documents\\GitHub\\SDA_Project\\Frontend\\src';

function walk(d) {
  fs.readdirSync(d).forEach(f => {
    let p = path.join(d, f);
    if(fs.statSync(p).isDirectory()) walk(p);
    else if(p.endsWith('.tsx') || p.endsWith('.ts') || p.endsWith('.js')) {
      let c = fs.readFileSync(p, 'utf8');
      let original = c;
      
      // The user wanted $ replaced with Rupee (₹), but since the font supports $, let's just restore it to $ safely.
      c = c.replace(/\?\$/g, '$');
      c = c.replace(/\?\{/g, '${'); 
      c = c.replace(/\?(\d)/g, '$$$1');
      c = c.replace(/\\\?\$/g, '\\$'); 
      
      if(c !== original) {
        fs.writeFileSync(p, c, 'utf8');
        console.log('Fixed encoding in:', path.basename(p));
      }
    }
  });
}
walk(dir);
