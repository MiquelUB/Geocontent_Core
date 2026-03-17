const fs = require('fs');
const path = 'd:/ProjectXX/Geocontent_Core/components/admin/ManualPoiForm.tsx';
let txt = fs.readFileSync(path, 'utf8');
const searchStr = 'setHeading';
const index = txt.indexOf(searchStr);
console.log('Index:', index);
if (index > -1) {
    const startIndex = txt.lastIndexOf('<Input', index);
    const endIndex = txt.indexOf('/>', index) + 2;
    // Inspect what's there
    console.log('Snippet to replace:', txt.slice(startIndex, endIndex));
    txt = txt.slice(0, startIndex) + txt.slice(endIndex);
    fs.writeFileSync(path, txt, 'utf8');
    console.log('Success');
} else {
    console.log('Not found');
}
