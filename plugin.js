class SefariaPlugin extends HTMLElement {
  static get observedAttributes() {
    return ['sref'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.apiKeys = {
      openai: null,
      youtube: null,
    };

    // HTML structure
    this.shadowRoot.innerHTML = `
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
        <style>
          a {
            cursor: pointer;
          }
          #video-player {
            display: none;
            margin-top: 20px;
          }
          #video-player iframe {
            width: 100%;
            height: 315px;
          }
          #back-button {
            cursor: pointer;
            color: white;
            background-color: #007bff;
            padding: 10px;
            text-align: center;
            border-radius: 5px;
            margin-top: 10px;
          }
          #search-results {
            max-height: 300px;
            overflow-y: auto;
          }
          #api-setup {
            margin-top: 20px;
          }
        </style>
        <div id="setup-component" class="container mt-4">
          <div class="row">
            <div class="col-md-6">
              <input id="openai-key" type="text" class="form-control" placeholder="Enter OpenAI API Key">
            </div>
            <div class="col-md-6">
              <input id="youtube-key" type="text" class="form-control" placeholder="Enter YouTube API Key">
            </div>
          </div>
          <div class="row mt-3">
            <div class="col-md-12 text-center">
              <button id="save-keys-button" class="btn btn-success w-50">Save API Keys</button>
            </div>
          </div>
          <div id="error-message" class="text-danger mt-2"></div>
        </div>
        <div id="search-component" class="container mt-4 d-none">
          <div class="row mb-3">
            <div class="col-md-8">
              <select id="data-source" class="form-select">
                <option value="wikipedia">Wikipedia</option>
                <option value="youtube">YouTube</option>
                <option value="twitter">Twitter</option>
              </select>
            </div>
            <div class="col-md-4">
              <button id="search-button" class="btn btn-primary w-100">Search</button>
            </div>
          </div>
          <div id="search-results" class="list-group mt-4"></div>
          <div id="video-player" class="mt-4">
            <iframe id="youtube-iframe" class="rounded shadow" frameborder="0" allowfullscreen></iframe>
            <div id="back-button" class="mt-3">Back</div>
          </div>
        </div>
      `;

    // References to elements
    this.dataSourceSelect = this.shadowRoot.querySelector('#data-source');
    this.searchButton = this.shadowRoot.querySelector('#search-button');
    this.searchResultsDiv = this.shadowRoot.querySelector('#search-results');
    this.videoPlayerDiv = this.shadowRoot.querySelector('#video-player');
    this.youtubeIframe = this.shadowRoot.querySelector('#youtube-iframe');
    this.backButton = this.shadowRoot.querySelector('#back-button');
    this.openAIInput = this.shadowRoot.querySelector('#openai-key');
    this.youtubeInput = this.shadowRoot.querySelector('#youtube-key');
    this.saveKeysButton = this.shadowRoot.querySelector('#save-keys-button');
    this.errorMessage = this.shadowRoot.querySelector('#error-message');
    this.searchComponent = this.shadowRoot.querySelector('#search-component');
    this.setupComponent = this.shadowRoot.querySelector('#setup-component');
    this.sefariaText = ''; // To store the fetched Sefaria text
  }

  saveKeys() {
    const openAIKey = this.openAIInput.value.trim();
    const youtubeKey = this.youtubeInput.value.trim();

    if (!openAIKey || !youtubeKey) {
      this.errorMessage.textContent = 'Both OpenAI and YouTube API keys are required.';
      return;
    }

    this.apiKeys.openai = openAIKey;
    this.apiKeys.youtube = youtubeKey;

    this.setupComponent.classList.add('d-none');
    this.searchComponent.classList.remove('d-none');
    this.errorMessage.textContent = '';
  }

  connectedCallback() {
    this.searchButton.addEventListener('click', () => this.handleSearch());
    this.backButton.addEventListener('click', () => this.handleBack());
    this.saveKeysButton.addEventListener('click', () => this.saveKeys());
  }

  disconnectedCallback() {
    this.searchButton.removeEventListener('click', () => this.handleSearch());
    this.backButton.removeEventListener('click', () => this.handleBack());
    this.saveKeysButton.removeEventListener('click', () => this.saveKeys());
  }

  async handleSearch() {
    const dataSource = this.dataSourceSelect.value;
    if (!this.sefariaText) {
      alert('Sefaria text not loaded yet.');
      return;
    }
    this.searchResultsDiv.innerHTML = 'Generating queries...';

    try {
      // Generate search queries using OpenAI
      const queries = await this.generateSearchQueries(dataSource, this.sefariaText);
      if (!queries || queries.length === 0) {
        this.searchResultsDiv.innerHTML = 'No queries generated.';
        return;
      }
      this.searchResultsDiv.innerHTML = 'Searching...';

      // Perform search on the selected data source
      if (dataSource === 'wikipedia') {
        await this.searchWikipedia(queries);
      } else if (dataSource === 'youtube') {
        await this.searchYouTube(queries);
      } else if (dataSource === 'twitter') {
        await this.searchTwitter(queries);
      }
    } catch (error) {
      this.searchResultsDiv.innerHTML = 'An error occurred during search.';
      console.error(error);
    }
  }

  // Observe attribute changes
  async attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'sref' && newValue !== oldValue) {
      try {
        this.sefariaText = await this.fetchSefariaText(newValue);
      } catch (error) {
        this.searchResultsDiv.innerHTML = 'Failed to fetch Sefaria text.';
        console.error(error);
      }
    }
  }

  async fetchSefariaText(sref) {
    const url = `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(sref)}?version=english`;
    this.searchResultsDiv.innerHTML = 'Fetching Sefaria text...';

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();

    // Combine the text array into a single string if necessary
    const text = data.versions[0].text;
    this.searchResultsDiv.innerHTML = 'Sefaria text loaded.';
    return text;
  }

  async generateSearchQueries(dataSource, text) {
    const prompt = `Create relevant search queries for ${dataSource} that would be relevant for a Jewish person learning the following passage:\n\n${text}\n\nReturn data as a simple list of queries (just text). Use ";" to separate queries.`;
    const apiKey = this.apiKeys.openai;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        n: 1,
        stop: null,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content.trim();
    return generatedText.split(';').map((query) => query.trim());
  }

  // Function to search Wikipedia
  async searchWikipedia(queries) {
    let allResults = [];

    // Fetch all searches in parallel
    const fetchPromises = queries.map(async (query) => {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srsearch=${encodeURIComponent(query)}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.query && data.query.search) {
          return data.query.search;
        }
      } catch (error) {
        console.error('Error searching Wikipedia for query:', query, error);
      }
      return [];
    });

    // Wait for all fetches to complete
    const resultsArrays = await Promise.all(fetchPromises);
    allResults = allResults.concat(...resultsArrays);

    if (allResults.length === 0) {
      this.searchResultsDiv.innerHTML = 'No results found.';
    } else {
      this.displayResults(allResults, 'wikipedia');
    }
  }

  // Function to search YouTube
  async searchYouTube(queries) {
    const apiKey = this.apiKeys.youtube;
    let allResults = [];

    const fetchPromises = queries.map(async (query) => {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${apiKey}&type=video&maxResults=5`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.items) {
          return data.items;
        }
      } catch (error) {
        console.error('Error searching YouTube for query:', query, error);
      }
      return [];
    });

    // Wait for all fetches to complete
    const resultsArrays = await Promise.all(fetchPromises);
    allResults = allResults.concat(...resultsArrays);

    if (allResults.length === 0) {
      this.searchResultsDiv.innerHTML = 'No results found.';
    } else {
      this.displayResults(allResults, 'youtube');
    }
  }

  // Function to search Twitter (Placeholder)
  async searchTwitter(queries) {
    this.searchResultsDiv.innerHTML = 'Twitter API access requires authentication. This functionality is not implemented.';
    // Placeholder for Twitter search implementation
  }

  displayResults(results, source) {
    const searchResultsDiv = this.shadowRoot.querySelector("#search-results");
    searchResultsDiv.innerHTML = "";
  
    if (!results || results.length === 0) {
      searchResultsDiv.innerHTML = '<div class="alert alert-warning">No results found.</div>';
      return;
    }

    // Remove duplicate results based on title or ID
    const uniqueResults = [];
    const titles = new Set();

    results.forEach((result) => {
      let title, link, videoId;
      if (source === 'wikipedia') {
        title = result.title;
        link = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
      } else if (source === 'youtube') {
        title = result.snippet.title;
        videoId = result.id.videoId;
        link = `https://www.youtube.com/watch?v=${videoId}`;
      }

      // Check for duplicates
      if (!titles.has(title)) {
        titles.add(title);
        const a = document.createElement("a");
        a.className = "list-group-item list-group-item-action";
        a.textContent = title;
  
        if (source === "youtube") {
          a.addEventListener("click", () => this.showYouTubeVideo(videoId));
        } else {
          a.href = link;
          a.target = "_blank";
        }
  
        searchResultsDiv.appendChild(a);
      }
    });
  }

  showYouTubeVideo(videoId) {
    this.searchResultsDiv.style.display = 'none';
    this.videoPlayerDiv.style.display = 'block';
    this.youtubeIframe.src = `https://www.youtube.com/embed/${videoId}`;
  }

  handleBack() {
    this.youtubeIframe.src = '';
    this.videoPlayerDiv.style.display = 'none';
    this.searchResultsDiv.style.display = 'block';
  }

}

// Define the new custom element
customElements.define('sefaria-plugin', SefariaPlugin);
