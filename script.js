let citationCount = 1;

// Attach listener to the initial form
attachAutoFillListener(document.getElementsByClassName('citation-form')[0]);

document.getElementById('add-citation').addEventListener('click', () => {
    citationCount++;
    const formTemplate = `
        <div class="citation-form">
            <h2>Citation #${citationCount}</h2>
            <div class="url-input-group">
                <input type="url" placeholder="Enter URL to auto-fill" class="url-autofill">
                <button class="auto-fill-btn">Auto-fill</button>
            </div>
            <input type="text" placeholder="Author's Last Name" class="author-last">
            <input type="text" placeholder="Author's First Name" class="author-first">
            <input type="text" placeholder="Article Title" class="article-title">
            <input type="text" placeholder="Website Name" class="website-name">
            <input type="text" placeholder="Publisher" class="publisher">
            <input type="date" class="pub-date">
            <input type="url" placeholder="URL" class="url">
            <input type="date" class="access-date">
        </div>
    `;
    document.getElementById('forms-container').insertAdjacentHTML('beforeend', formTemplate);
    attachAutoFillListener(document.getElementsByClassName('citation-form')[citationCount - 1]);
});

function attachAutoFillListener(formElement) {
    const autoFillBtn = formElement.querySelector('.auto-fill-btn');
    const originalBtnText = autoFillBtn.textContent;
    
    autoFillBtn.addEventListener('click', async () => {
        const urlInput = formElement.querySelector('.url-autofill');
        const url = urlInput.value.trim();
        
        if (!url) {
            alert('Please enter a URL');
            return;
        }

        // Show loading state
        autoFillBtn.disabled = true;
        autoFillBtn.textContent = 'Please wait...';

        try {
            // Use a CORS proxy to fetch the webpage
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            
            // Create a temporary element to parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.contents, 'text/html');
            
            // Extract metadata
            const metadata = {
                title: doc.querySelector('meta[property="og:title"]')?.content || 
                       doc.querySelector('title')?.textContent || '',
                author: doc.querySelector('meta[name="author"]')?.content || '',
                siteName: doc.querySelector('meta[property="og:site_name"]')?.content || 
                         new URL(url).hostname.replace('www.', ''),
                publishDate: doc.querySelector('meta[property="article:published_time"]')?.content || 
                           doc.querySelector('meta[name="publication_date"]')?.content,
                publisher: doc.querySelector('meta[name="publisher"]')?.content || 
                          doc.querySelector('meta[property="og:site_name"]')?.content
            };

            // Fill in the form
            formElement.querySelector('.article-title').value = metadata.title;
            formElement.querySelector('.url').value = url;
            formElement.querySelector('.website-name').value = metadata.siteName;
            formElement.querySelector('.publisher').value = metadata.publisher || metadata.siteName;
            
            // Handle author name
            if (metadata.author) {
                const nameParts = metadata.author.split(' ');
                if (nameParts.length >= 2) {
                    formElement.querySelector('.author-last').value = nameParts[nameParts.length - 1];
                    formElement.querySelector('.author-first').value = nameParts[0];
                }
            }
            
            // Set publication date if available
            if (metadata.publishDate) {
                formElement.querySelector('.pub-date').value = new Date(metadata.publishDate)
                    .toISOString().split('T')[0];
            }
            
            // Set access date to today
            formElement.querySelector('.access-date').value = new Date().toISOString().split('T')[0];

        } catch (error) {
            console.error('Error fetching webpage:', error);
            alert('Unable to fetch webpage information. Please fill in the details manually.');
        } finally {
            // Reset button state
            autoFillBtn.disabled = false;
            autoFillBtn.textContent = originalBtnText;
        }
    });
}

document.getElementById('generate').addEventListener('click', () => {
    const citations = document.getElementsByClassName('citation-form');
    let bibliography = '';

    Array.from(citations).forEach(citation => {
        const authorLast = citation.querySelector('.author-last').value.trim();
        const authorFirst = citation.querySelector('.author-first').value.trim();
        const articleTitle = citation.querySelector('.article-title').value.trim() || '[Untitled]';
        const websiteName = citation.querySelector('.website-name').value.trim();
        const publisher = citation.querySelector('.publisher').value.trim();
        const pubDateInput = citation.querySelector('.pub-date').value;
        const url = citation.querySelector('.url').value.trim();
        const accessDateInput = citation.querySelector('.access-date').value;

        // Validate required fields
        if (!url) {
            alert('URL is required for each citation.');
            return;
        }

        if (!websiteName) {
            alert('Website name is required for each citation.');
            return;
        }

        // Format dates
        let pubDateString = '';
        if (pubDateInput) {
            const pubDate = new Date(pubDateInput);
            pubDateString = pubDate.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }) + ', ';
        }
        
        let accessDateFormatted = '';
        if (accessDateInput) {
            const accessDate = new Date(accessDateInput);
            accessDateFormatted = accessDate.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } else {
            const today = new Date();
            accessDateFormatted = today.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }

        // Create author string only if both names are provided
        let authorString = '';
        if (authorLast && authorFirst) {
            authorString = `${authorLast}, ${authorFirst}. `;
        }

        // Handle publisher
        let publisherString = '';
        if (publisher && publisher !== websiteName) {
            publisherString = `, ${publisher}`;
        }

        // Create MLA citation
        const mlaCitation = `${authorString}"${articleTitle}." ${websiteName}${publisherString}, ${pubDateString}${url}. Accessed ${accessDateFormatted}.`;
        
        bibliography += `<p>${mlaCitation}</p>`;
    });

    document.getElementById('bibliography-output').innerHTML = bibliography;
    
    // Show copy button if bibliography is not empty
    const copyButton = document.getElementById('copy-bibliography');
    copyButton.style.display = bibliography ? 'block' : 'none';
});

// Add copy button functionality
document.getElementById('copy-bibliography').addEventListener('click', async () => {
    const copyButton = document.getElementById('copy-bibliography');
    const originalText = copyButton.textContent;
    const bibliography = document.getElementById('bibliography-output').innerText;

    try {
        await navigator.clipboard.writeText(bibliography);
        copyButton.textContent = 'Copied!';
        copyButton.disabled = true;
        
        // Reset button after 2 seconds
        setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.disabled = false;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        copyButton.textContent = 'Failed to copy';
        
        setTimeout(() => {
            copyButton.textContent = originalText;
        }, 2000);
    }
}); 