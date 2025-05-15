// ==UserScript==
// @name         CWGH saver
// @namespace    https://github.com/Acedia431/CWGH-saver
// @version      0.4.0
// @description  Saves solutions and conditions of problems from Codewars to a GitHub repository
// @author       Acedia431
// @match        https://www.codewars.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.github.com
// ==/UserScript==

(function() {
    "use strict";
    
    // === STYLES ===
    GM_addStyle(`
        .cwgh-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: sans-serif;
        }

        .cwgh-modal-content {
            background: #2a2a2e;
            color: #f5f5f5;
            border-radius: 4px;
            width: 500px;
            max-width: 90%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 1px solid #444;
        }

        .cwgh-modal-header {
            padding: 15px 20px;
            border-bottom: 1px solid #444;
            font-size: 18px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .cwgh-modal-body {
            padding: 20px;
        }

        .cwgh-form-group {
            margin-bottom: 15px;
        }

        .cwgh-form-group label {
            display: block;
            margin-bottom: 5px;
            font-size: 14px;
            color: #ccc;
        }

        .cwgh-form-group input {
            width: 100%;
            padding: 8px 10px;
            background: #1e1e22;
            border: 1px solid #444;
            border-radius: 3px;
            color: #f5f5f5;
            font-size: 14px;
        }

        .cwgh-form-group input:focus {
            outline: none;
            border-color: #6795de;
        }

        .cwgh-modal-footer {
            padding: 15px 20px;
            border-top: 1px solid #444;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        .cwgh-btn {
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            border: none;
            transition: all 0.2s;
        }

        .cwgh-btn-primary {
            background: #6795de;
            color: white;
        }

        .cwgh-btn-primary:hover {
            background: #5a82c5;
        }

        .cwgh-btn-secondary {
            background: transparent;
            color: #ccc;
            border: 1px solid #666;
        }

        .cwgh-btn-secondary:hover {
            background: #3a3a3e;
        }

        .cwgh-help-text {
            font-size: 12px;
            color: #999;
            margin-top: 5px;
        }

        #github-save-btn {
            margin-left: 10px;
            background: #6795de;
            border-color: #6795de;
        }

        #github-save-btn:hover {
            background: #5a82c5;
            border-color: #5a82c5;
        }
    `);

    // === CONFIGURATION MODULE ===
    const Configuration = (() => {
        const config = {
            get GITHUB_TOKEN() {
                return GM_getValue("GITHUB_TOKEN", "")
            },
            get REPO_OWNER() {
                return GM_getValue("REPO_OWNER", "")
            },
            get REPO_NAME() {
                return GM_getValue("REPO_NAME", "")
            },
            get BRANCH() {
                return GM_getValue("BRANCH", "main")
            },

            isConfigured() {
                return Boolean(
                    this.GITHUB_TOKEN &&
                    this.REPO_OWNER &&
                    this.REPO_NAME
                );
            },

            async showConfigurationModal() {
                return new Promise((resolve) => {
                    const modal = document.createElement('div');
                    modal.className = 'cwgh-modal';

                    modal.innerHTML = `
                        <div class="cwgh-modal-content">
                            <div class="cwgh-modal-header">
                                <span>GitHub Configuration</span>
                            </div>
                            <div class="cwgh-modal-body">
                                <div class="cwgh-form-group">
                                    <label for="cwgh-token">Personal Access Token</label>
                                    <input type="password" id="cwgh-token" value="${this.GITHUB_TOKEN}" placeholder="ghp_...">
                                    <div class="cwgh-help-text">Create token at: <a href="https://github.com/settings/tokens" target="_blank" style="color: #6795de;">github.com/settings/tokens</a> (required scope: "repo")</div>
                                </div>

                                <div class="cwgh-form-group">
                                    <label for="cwgh-owner">Username</label>
                                    <input type="text" id="cwgh-owner" value="${this.REPO_OWNER}" placeholder="your-username">
                                </div>

                                <div class="cwgh-form-group">
                                    <label for="cwgh-repo">Repository Name</label>
                                    <input type="text" id="cwgh-repo" value="${this.REPO_NAME}" placeholder="your-repo-name">
                                </div>

                                <div class="cwgh-form-group">
                                    <label for="cwgh-branch">Branch</label>
                                    <input type="text" id="cwgh-branch" value="${this.BRANCH}" placeholder="main">
                                </div>
                            </div>
                            <div class="cwgh-modal-footer">
                                <button class="cwgh-btn cwgh-btn-secondary" id="cwgh-cancel">Cancel</button>
                                <button class="cwgh-btn cwgh-btn-primary" id="cwgh-save">Save Configuration</button>
                            </div>
                        </div>
                    `;

                    document.body.appendChild(modal);

                    const saveBtn = modal.querySelector('#cwgh-save');
                    const cancelBtn = modal.querySelector('#cwgh-cancel');

                    const closeModal = (success = false) => {
                        document.body.removeChild(modal);
                        resolve(success);
                    };

                    saveBtn.addEventListener('click', () => {
                        const token = modal.querySelector('#cwgh-token').value.trim();
                        const owner = modal.querySelector('#cwgh-owner').value.trim();
                        const repo = modal.querySelector('#cwgh-repo').value.trim();
                        const branch = modal.querySelector('#cwgh-branch').value.trim() || "main";

                        if (!token || !owner || !repo) {
                            alert("Please fill all required fields!");
                            return;
                        }

                        GM_setValue("GITHUB_TOKEN", token);
                        GM_setValue("REPO_OWNER", owner);
                        GM_setValue("REPO_NAME", repo);
                        GM_setValue("BRANCH", branch);

                        closeModal(true);
                    });

                    cancelBtn.addEventListener('click', () => closeModal(false));

                    modal.addEventListener('click', (event) => {
                        if (event.target === modal) {
                            closeModal(false);
                        }
                    });
                });
            }
        };

        return {
            config: config,
        };
    })();

    // === UTILS MODULE ===
    const Utils = (() => {
        function toBase64(str) {
            const bytes = new TextEncoder().encode(str);
            const binary = Array.from(bytes).map(byte => String.fromCharCode(byte)).join("");
            return btoa(binary);
        }

        function stripHtml(html) {
            const doc = new DOMParser().parseFromString(html, "text/html");
            return doc.body.textContent || "";
        }

        return {
            toBase64: toBase64,
            stripHtml: stripHtml
        };
    })();

    // === GETDATA MODULE ===
    const GetData = (() => {
        async function waitForElement(selector, timeout = 10000) {
            return new Promise((resolve, reject) => {
                const existingElement = document.querySelector(selector);
                if (existingElement) {
                    resolve(existingElement);
                    return;
                }

                let resolved = false;

                const observer = new MutationObserver(() => {
                    const element = document.querySelector(selector);
                    if (element && !resolved) {
                        observer.disconnect();
                        resolved = true;
                        resolve(element);
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                setTimeout(() => {
                    if (!resolved) {
                        observer.disconnect();
                        reject(new Error(`Element ${selector} not found`));
                    }
                }, timeout);
            });
        }

        async function getSolution() {
            try {
                const editor = await waitForElement(".CodeMirror");
                return editor?.CodeMirror?.getValue() || "";
            } catch (error) {
                console.error("Error getting solution:", error);
                return "";
            }
        }

        function getProblemData() {
            const titleElem = document.querySelector(".ml-2.mb-3");
            const kyuElem = titleElem?.closest(".flex.items-center")?.querySelector(".inner-small-hex.is-extra-wide");
            const descriptionElem = document.querySelector(".markdown.prose.max-w-none.mb-8");
            const tagsElems = document.querySelectorAll(".keyword-tag") || [];
            const language = document.querySelector(".language-selector .mr-4");

            return {
                title: titleElem?.textContent?.trim() || "Untitled",
                kyu: kyuElem?.textContent?.trim() || "Unknown",
                description: descriptionElem?.innerHTML || "No description available",
                tags: [...tagsElems].map(tag => tag.textContent?.trim()).filter(Boolean),
                language: language?.textContent.replace("Language", "").trim().toLowerCase() || "Unknown",
                link: window.location.href
            };
        }

        return {
            waitForElement: waitForElement,
            getSolution: getSolution,
            getProblemData: getProblemData
        };
    })();

    // === GITHUB MODULE ===
    const GitHub = ((utils, getData, configuration) => {
        const langExtensions = {
            "javascript": "js",
            "python": "py",
            "java": "java",
            "c#": "cs",
            "ruby": "rb",
            "typescript": "ts",
            "go": "go",
            "c++": "cpp",
            "unknown": "txt"
        };

        async function getFileStatus(path) {
            try {
                const response = await githubApiRequest(
                    `GET /repos/${configuration.config.REPO_OWNER}/${configuration.config.REPO_NAME}/contents/${encodeURIComponent(path)}?ref=${configuration.config.BRANCH}`,
                    null
                );
                return { exists: true, sha: response.sha };
            } catch (error) {
                if (error.message.includes("404")) {
                    return { exists: false };
                }
                throw error;
            }
        }

        async function commitToGitHub(data) {
            if (!data.solution) throw new Error("No solution code to save");

            const cleanKyu = data.kyu.replace(/\s*kyu\s*/i, "").trim();
            const cleanTitle = data.title.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");
            const basePath = `Codewars/${cleanKyu} kyu/${cleanTitle}/`;

            const extension = langExtensions[data.language];
            const solutionPath = `${basePath}solution.${extension}`;
            const readmePath = `${basePath}README.md`;

            const updateFile = async (path, content) => {
                const status = await getFileStatus(path);
                const message = `${status.exists ? "Update" : "Add"} ${path === solutionPath ? "solution" : "README"} for ${data.title}`;

                await githubApiRequest(
                    `PUT /repos/${configuration.config.REPO_OWNER}/${configuration.config.REPO_NAME}/contents/${encodeURIComponent(path)}`,
                    {
                        message,
                        content: utils.toBase64(content),
                        branch: configuration.config.BRANCH,
                        ...(status.exists && { sha: status.sha })
                    }
                );
            };

            await updateFile(solutionPath, data.solution);
            await updateFile(
                readmePath,
                `# ${data.title}
                \n\n**Kyu:** ${data.kyu}
                \n\n**Description:**
                \n\n${utils.stripHtml(data.description)}
                \n\n**Tags:** ${data.tags.join(', ')}
                \n\n[Original problem](${data.link})`
            );
        }

        function githubApiRequest(endpoint, data) {
            const [method, path] = endpoint.split(' ');
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: method,
                    url: `https://api.github.com${path}`,
                    headers: {
                        'Authorization': `token ${configuration.config.GITHUB_TOKEN}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    data: data ? JSON.stringify(data) : undefined,
                    onload: (response) => {
                        if (response.status >= 200 && response.status < 300) {
                            resolve(JSON.parse(response.responseText));
                        } else {
                            let errorMsg = `GitHub API error: ${response.status}`;
                            try {
                                const errorData = JSON.parse(response.responseText);
                                errorMsg += ` - ${errorData.message || 'No message'}`;
                                if (errorData.errors) {
                                    errorMsg += ` (${JSON.stringify(errorData.errors)})`;
                                }
                            } catch (e) {}
                            reject(new Error(errorMsg));
                        }
                    },
                    onerror: (error) => {
                        reject(new Error(`Network error: ${error.statusText}`));
                    },
                    timeout: 10000
                });
            });
        }

        return {
            getFileStatus: getFileStatus,
            commitToGitHub: commitToGitHub,
            githubApiRequest: githubApiRequest
        };
    })(Utils, GetData, Configuration);

    // === MAIN MODULE ===
    const Main = ((github, getData, configuration) => {

        // === BUTTONS CREATE AND ADD SUBMODULE ===
        function createAndAddButtons() {
            function createSaveButton() {
                const button = document.createElement("button");
                button.id = "github-save-btn";
                button.className = "btn";
                button.textContent = "Save to GitHub";
                button.onclick = handleSaveClick;
                return button;
            }

            function createSettingsButton() {
                const button = document.createElement("button");
                button.id = "github-settings-btn";
                button.className = "btn";
                button.textContent = "Settings";
                button.onclick = async () => {
                    await configuration.config.showConfigurationModal();
                };
                return button;
            }

            async function addSettingsButton() {
                if (document.querySelector('#github-settings-btn')) {
                    return;
                }
    
                const targetElement = document.querySelector(".w-full.mt-4.flex.flex-row.flex-nowrap.items-center.justify-between");
                targetElement.appendChild(createSettingsButton());
    
            }
    
            async function addSaveButton() {
                if (document.querySelector('#github-save-btn')) {
                    return;
                }
    
                const targetElement = document.querySelector(".w-full.mt-4.flex.flex-row.flex-nowrap.items-center.justify-between");
                targetElement.appendChild(createSaveButton());
            }

            return {
                addSettingsButton: addSettingsButton,
                addSaveButton: addSaveButton
            };
        }

        async function handleSaveClick() {
            const button = this;
            button.disabled = true;
            button.style.backgroundColor = "#7c9a44";
            button.style.borderColor = "#7c9a44";
            button.textContent = "Saving...";

            try {
                if (!configuration.config.isConfigured()) {
                    const configured = await configuration.config.showConfigurationModal();
                    if (!configured) throw new Error("Configuration cancelled");
                }

                const problemData = getData.getProblemData();
                problemData.solution = await getData.getSolution();

                if (!problemData.solution) {
                    throw new Error("No solution code found in editor");
                }

                await github.commitToGitHub(problemData);
                button.textContent = "Saved!";
            } catch (error) {
                console.error("Save error:", error);
                button.textContent = "Error!";
                button.style.backgroundColor = "#bb432c";
                button.style.borderColor = "#bb432c";
                alert(`Save failed: ${error.message}`);
            } finally {
                setTimeout(() => {
                    button.textContent = "Save to GitHub";
                    button.style.backgroundColor = "#6795de";
                    button.style.borderColor = "#6795de";
                    button.disabled = false;
                }, 3000);
            }
        }

        async function init() {
            const buttons = createAndAddButtons();
            
            const tryAddButton = () => {
                const isPageReady =
                    document.querySelector(".ml-2.mb-3") ||
                    document.querySelector(".markdown.prose.max-w-none.mb-8") ||
                    document.querySelector(".CodeMirror");

                if (isPageReady) {
                    buttons.addSaveButton();
                    buttons.addSettingsButton();
                    if (observer) {
                        observer.disconnect();
                        return true;
                    }
                }
                return false;
            };

            const observer = new MutationObserver(tryAddButton);
            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
                if (observer) observer.disconnect();
            }, 20000);
        }

        return {
            init: init
        };
    })(GitHub, GetData, Configuration);

    if (document.readyState === "complete") {
        setTimeout(Main.init, 500);
    } else {
        window.addEventListener("load", () => setTimeout(Main.init, 500));
    }
    setTimeout(Main.init, 1500);
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
        originalPushState.apply(this, args);
        setTimeout(Main.init, 1000);
    };

    window.addEventListener("popstate", () => {
    setTimeout(Main.init, 1000);
    });
})();