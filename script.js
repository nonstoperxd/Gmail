let fiveDigitInterval = null;
let eightDigitInterval = null;
let gmailVariations = [];
let usedVariations = [];
let currentVariationIndex = -1;

// Load stored data on page load
window.onload = function () {
    const storedOrderId = localStorage.getItem('orderId');
    const storedEmail = localStorage.getItem('email');
    if (storedOrderId && storedEmail) {
        document.getElementById('emailUrl').value = `${storedEmail}----https://api.online-disposablemail.com/api/latest/code?orderId=${storedOrderId}`;
        document.getElementById('emailDisplay').textContent = storedEmail;
        document.getElementById('copyEmail').style.display = 'inline-block';
        fetchCodes(storedOrderId);
        generateGmailVariations(storedEmail);
        displayNextGmail();
    }
};

async function fetchCodes(orderId) {
    const errorDiv = document.getElementById('emailUrlError');

    if (!orderId) {
        errorDiv.textContent = 'No Order ID available.';
        return;
    }

    localStorage.setItem('orderId', orderId);
    errorDiv.textContent = '';

    document.getElementById('fiveDigitLoader').style.display = 'block';
    document.getElementById('eightDigitLoader').style.display = 'block';

    clearInterval(fiveDigitInterval);
    clearInterval(eightDigitInterval);

    fiveDigitInterval = setInterval(() => fetchCode(
        `https://api.online-disposablemail.com/api/latest/code?orderId=${orderId}`,
        'fiveDigitCode',
        'copyFiveDigit',
        'fiveDigitLoader',
        'fiveDigitError',
        5
    ), 1000);

    eightDigitInterval = setInterval(() => fetchCode(
        `https://api.online-disposablemail.com/api/latest/code?orderId=${orderId}&serviceItemId=23`,
        'eightDigitCode',
        'copyEightDigit',
        'eightDigitLoader',
        'eightDigitError',
        8
    ), 1000);
}

async function processEmailAndUrl() {
    const emailUrlInput = document.getElementById('emailUrl').value.trim();
    const emailUrlError = document.getElementById('emailUrlError');
    const emailDisplay = document.getElementById('emailDisplay');
    const copyEmailBtn = document.getElementById('copyEmail');
    const emailError = document.getElementById('emailError');

    if (!emailUrlInput) {
        emailUrlError.textContent = 'Please enter a valid Email & URL.';
        return;
    }

    const parts = emailUrlInput.split('----');
    if (parts.length !== 2) {
        emailUrlError.textContent = 'Invalid format. Use email----url';
        return;
    }

    const email = parts[0].trim();
    const url = parts[1].trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        emailUrlError.textContent = 'Invalid email format.';
        return;
    }

    if (!email.endsWith('@gmail.com')) {
        emailUrlError.textContent = 'Email must be a Gmail address.';
        return;
    }

    const urlParams = new URLSearchParams(url.split('?')[1]);
    const orderId = urlParams.get('orderId');

    if (!orderId) {
        emailUrlError.textContent = 'Invalid URL. No Order ID found.';
        return;
    }

    localStorage.setItem('email', email);
    emailDisplay.textContent = email;
    copyEmailBtn.style.display = 'inline-block';
    emailUrlError.textContent = '';
    emailError.textContent = '';

    fetchCodes(orderId);
    generateGmailVariations(email);
    displayNextGmail();
}

async function fetchCode(url, codeElementId, copyButtonId, loaderId, errorId, expectedLength) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();

        if (data.code === 200 && data.msg === 'Operation successful!') {
            let codeToDisplay = null;

            if (codeElementId === 'fiveDigitCode') {
                if (data.data?.code) {
                    codeToDisplay = data.data.code;
                    if (codeToDisplay.includes(',')) {
                        codeToDisplay = data.data.code.split(',')[0];
                    }
                }
                if (!codeToDisplay && (data.data?.title || data.data?.content)) {
                    const text = (data.data.title || '') + ' ' + (data.data.content || '');
                    const match = text.match(/\b\d{5}\b/);
                    if (match) {
                        codeToDisplay = match[0];
                    }
                }
            } else {
                codeToDisplay = data.data?.code;
            }

            if (codeToDisplay && codeToDisplay.length === expectedLength) {
                document.getElementById(codeElementId).textContent = codeToDisplay;
                document.getElementById(copyButtonId).style.display = 'inline-block';
                document.getElementById(loaderId).style.display = 'none';
                document.getElementById(errorId).textContent = '';
                if (codeElementId === 'fiveDigitCode') clearInterval(fiveDigitInterval);
                else clearInterval(eightDigitInterval);
            } else {
                document.getElementById(errorId).textContent = 'Waiting to receive verification code...';
            }
        } else {
            document.getElementById(errorId).textContent = 'Waiting to receive verification code...';
        }
    } catch (error) {
        document.getElementById(errorId).textContent = 'Failed to fetch code. Retrying...';
    }
}

function copyCode(elementId) {
    const code = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(code).then(() => {
        const codeElement = document.getElementById(elementId);
        codeElement.classList.add('copied');
        setTimeout(() => codeElement.classList.remove('copied'), 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        document.getElementById('emailError').textContent = 'Failed to copy.';
    });
}

function clearOrderId() {
    localStorage.removeItem('orderId');
    localStorage.removeItem('email');
    document.getElementById('emailUrl').value = '';
    document.getElementById('emailDisplay').textContent = '';
    document.getElementById('fiveDigitCode').textContent = '';
    document.getElementById('eightDigitCode').textContent = '';
    document.getElementById('copyEmail').style.display = 'none';
    document.getElementById('copyFiveDigit').style.display = 'none';
    document.getElementById('copyEightDigit').style.display = 'none';
    document.getElementById('fiveDigitLoader').style.display = 'none';
    document.getElementById('eightDigitLoader').style.display = 'none';
    document.getElementById('emailError').textContent = '';
    document.getElementById('fiveDigitError').textContent = '';
    document.getElementById('eightDigitError').textContent = '';
    document.getElementById('emailUrlError').textContent = '';
    clearInterval(fiveDigitInterval);
    clearInterval(eightDigitInterval);
    clearGmail();
}

// Gmail Variations Logic
function generateGmailVariations(email) {
    if (!email.endsWith('@gmail.com')) return;

    const username = email.split('@')[0];
    if (!username) return;

    gmailVariations = [];
    usedVariations = JSON.parse(localStorage.getItem('usedVariations') || '[]');

    const chars = username.split('');
    const n = chars.length - 1;
    const totalCombinations = 1 << n;

    for (let i = 1; i < totalCombinations; i++) {
        let variation = chars[0];
        for (let j = 0; j < n; j++) {
            if (i & (1 << j)) {
                variation += '.' + chars[j + 1];
            } else {
                variation += chars[j + 1];
            }
        }
        const fullEmail = variation + '@gmail.com';
        if (!usedVariations.includes(fullEmail)) {
            gmailVariations.push(fullEmail);
        }
    }

    for (let i = gmailVariations.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gmailVariations[i], gmailVariations[j]] = [gmailVariations[j], gmailVariations[i]];
    }

    currentVariationIndex = -1;
}

function displayNextGmail() {
    const gmailDisplay = document.getElementById('gmailDisplay');
    const copyGmailBtn = document.getElementById('copyGmail');
    const gmailError = document.getElementById('gmailError');

    if (gmailVariations.length === 0) {
        gmailDisplay.textContent = '';
        copyGmailBtn.style.display = 'none';
        gmailError.textContent = 'No more Gmail variations available.';
        console.log('No variations available');
        return;
    }

    currentVariationIndex = (currentVariationIndex + 1) % gmailVariations.length;
    const nextVariation = gmailVariations[currentVariationIndex];
    gmailDisplay.textContent = nextVariation;
    copyGmailBtn.style.display = 'inline-block';
    gmailError.textContent = '';
    console.log('Displayed Gmail variation:', nextVariation);

    if (!usedVariations.includes(nextVariation)) {
        usedVariations.push(nextVariation);
        localStorage.setItem('usedVariations', JSON.stringify(usedVariations));
    }
}

function copyGmail() {
    const gmail = document.getElementById('gmailDisplay').textContent;
    if (!gmail) {
        console.error('No Gmail to copy');
        document.getElementById('gmailError').textContent = 'No Gmail to copy.';
        return;
    }
    navigator.clipboard.writeText(gmail).then(() => {
        const gmailElement = document.getElementById('gmailDisplay');
        gmailElement.classList.add('copied');
        setTimeout(() => gmailElement.classList.remove('copied'), 2000);
        console.log('Copied Gmail:', gmail);
    }).catch(err => {
        console.error('Failed to copy Gmail:', err);
        document.getElementById('gmailError').textContent = 'Failed to copy Gmail.';
    });
}

function changeGmail() {
    displayNextGmail();
}

function clearGmail() {
    localStorage.removeItem('usedVariations');
    gmailVariations = [];
    usedVariations = [];
    currentVariationIndex = -1;
    document.getElementById('gmailDisplay').textContent = '';
    document.getElementById('copyGmail').style.display = 'none';
    document.getElementById('gmailError').textContent = '';
    console.log('Gmail variations cleared');
}
