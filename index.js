import { fetchJSON, renderProjects } from './global.js';
import { fetchGitHubData } from './global.js';

async function loadProjects() {
    try {
        const projects = await fetchJSON('./lib/projects.json');
        const latestProjects = projects.slice(0, 3);
        const projectsContainer = document.querySelector('.projects');
        if (!projectsContainer) {
            console.error("Error: Missing projects container.");
            return;
        }
        renderProjects(latestProjects, projectsContainer, 'h2');
    } catch (error) {
        console.error("Error loading latest projects:", error);
    }
}

const githubData = await fetchGitHubData('eibarolle');
const profileStats = document.querySelector('#profile-stats');
if (profileStats && githubData) {
    profileStats.innerHTML = `
        <h2>GitHub Profile Stats</h2>
        <dl>
          <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
          <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
          <dt>Followers:</dt><dd>${githubData.followers}</dd>
          <dt>Following:</dt><dd>${githubData.following}</dd>
        </dl>
    `;
}


loadProjects();
