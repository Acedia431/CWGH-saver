// ==UserScript==
// @name         CWGH saver
// @namespace    https://github.com/Acedia431/CWGH-saver
// @version      0.3.1
// @description  Saves solutions and conditions of problems from Codewars to a GitHub repository
// @author       Acedia431
// @match        https://www.codewars.com/kata/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// ==/UserScript==

(function() {
    "use strict";
    // === CONFIGURATION MODULE ===
    const Config = {
        GITHUB_TOKEN: "your_token",
        REPO_OWNER: "your_nickname",                    
        REPO_NAME: "your_repository_name",
        BRANCH: "main"
    };

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

                const start = Date.now();
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
    const GitHub = ((utils, getData) => {
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
                    `GET /repos/${Config.REPO_OWNER}/${Config.REPO_NAME}/contents/${encodeURIComponent(path)}?ref=${Config.BRANCH}`,
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
                const message = `${status.exists ? "Update" : "Add"} file for ${data.title}`;

                await githubApiRequest(
                    `PUT /repos/${Config.REPO_OWNER}/${Config.REPO_NAME}/contents/${encodeURIComponent(path)}`,
                    {
                        message,
                        content: utils.toBase64(content),
                        branch: Config.BRANCH,
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
                        'Authorization': `token ${Config.GITHUB_TOKEN}`,
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
    })(Utils, GetData);

    // === MAIN MODULE ===
    const Main = ((github, getData) => {
        function createSaveButton() {
            const button = document.createElement("button");
            button.id = "github-save-btn";
            button.className = "btn";
            button.style.marginLeft = "10px";
            button.textContent = "Save to GitHub";
            button.onclick = handleSaveClick;
            return button;
        }

        function addButtonNear(element) {
            if (document.querySelector("#github-save-btn")) {
                return;
            }
            const button = createSaveButton();
            element.parentNode.insertBefore(button, element.nextSibling);
        }

        async function addSaveButton() {
            if (document.querySelector('#github-save-btn')) {
                return;
            }
            let targetElement = null;
            const possibleToolbars = [
                ".list-item-solutions",
                ".flex.flex-row.items-center",
                ".flex.items-center.gap-2",
                ".mt-4.flex.items-center",
                ".flex.items-center",
                ".actions"
            ];
            for (const selector of possibleToolbars) {
                targetElement = document.querySelector(selector);
                if (targetElement) break;
            }
            if (!targetElement) {
                const submitButtons = [
                    ".submit-btn",
                    ".ml-2",
                    'button[type="submit"]',
                    'button[data-cy="submit-code-btn"]'
                ];
                for (const selector of submitButtons) {
                    targetElement = document.querySelector(selector);
                    if (targetElement) {
                        addButtonNear(targetElement);
                        return;
                    }
                }
                return;
            }
            const button = createSaveButton();
            targetElement.appendChild(button);
        }


    async function handleSaveClick() {
        const button = this;
        button.disabled = true;
        button.textContent = "Saving...";

        try {
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
            alert(`Save failed: ${error.message}`);
        } finally {
            setTimeout(() => {
                button.textContent = "Save to GitHub";
                button.disabled = false;
            }, 3000);
        }
    }

    function init() {
        const tryAddButton = () => {
            const isPageReady = document.querySelector('.inner-small-hex') ||
            document.querySelector('.problem-statement') ||
            document.querySelector('.CodeMirror');

            let lastUrl = window.location.href;
            const urlCheckInterval = setInterval(() => {
                if (window.location.href !== lastUrl) {
                    lastUrl = window.location.href;
                    tryAddButton();
                }
            }, 500);

            if (isPageReady) {
                addSaveButton();
                clearInterval(urlCheckInterval);
                return true;
            }
            return false;
        };

        if (!tryAddButton()) {
            const observer = new MutationObserver((mutations) => {
                if (tryAddButton()) {
                    observer.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
            }, 10000);
        }

        setTimeout(() => {
            clearInterval(urlCheckInterval);
        }, 30000);
    }

    return {
        init: init
    };
    })(GitHub, GetData);

    if (document.readyState === 'complete') {
        Main.init();
    } else {
        window.addEventListener('load', Main.init);
        document.addEventListener('DOMContentLoaded', Main.init);
    }
    setTimeout(Main.init, 1500);
})();
