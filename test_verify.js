
import fs from 'fs';
// Node 24 has global fetch, FormData, Blob

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
    const logFile = fs.createWriteStream('test_results.txt', { flags: 'a' });
    const log = (msg) => {
        console.log(msg);
        logFile.write(msg + '\n');
    };

    log(`--- Test Started at ${new Date().toISOString()} ---`);
    log(`Node Version: ${process.version}`);

    // 1. Seed Test Documents
    try {
        log('Testing /api/add-test-documents...');
        const res = await fetch(`${API_BASE}/add-test-documents`, { method: 'POST' });
        const text = await res.text();
        log(`Status: ${res.status}`);
        log(`Response: ${text}`);
    } catch (e) {
        log(`Seed Error: ${e.message}`);
    }

    // 2. Create Dummy Image
    const dummyPath = 'dummy_test.png';
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    fs.writeFileSync(dummyPath, pngBuffer);
    log('Created dummy_test.png');

    // 3. Verify Document
    try {
        log('Testing /api/verify...');
        
        const form = new FormData();
        form.append('docType', 'Identity Document');
        form.append('docNumber', 'TEST-001');
        
        const blob = new Blob([pngBuffer], { type: 'image/png' });
        form.append('document', blob, 'dummy_test.png');

        const res = await fetch(`${API_BASE}/verify`, { 
            method: 'POST',
            body: form
        });
        
        const text = await res.text();
        log(`Status: ${res.status}`);
        log(`Response: ${text}`);

    } catch (e) {
        log(`Verify Error: ${e.message}`);
    }
}

runTests().catch(err => {
    fs.appendFileSync('test_results.txt', `CRITICAL ERROR: ${err.message}\n`);
    console.error(err);
});
