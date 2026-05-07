const test = async () => {
    try {
        console.log("Fetching...");
        const res = await fetch('https://rembrandt7.vercel.app/api/proxy/google/v1beta/models/gemini-3.1-flash-preview:generateContent', {
            method: 'POST', 
            body: JSON.stringify({
                "contents": [{ "parts": [{"text": "Hello, how are you?"}] }]
            }), 
            headers:{ 'Content-Type': 'application/json'} 
        });
        console.log("Status:", res.status);
        console.log("Body:");
        console.log(await res.text());
    } catch(e) {
        console.error("Error:", e);
    }
};
test();
