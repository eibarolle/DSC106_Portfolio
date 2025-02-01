import {fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
    try {
        const projects = await fetchJSON('../lib/projects.json');
        const projectsContainer = document.querySelector('.projects');
        const projectsTitle = document.querySelector('.projects-title');
        if (!projectsTitle) {
            console.error("Error: Missing title element.");
            return;
        }
        if (!projectsContainer) {
            console.error("Error: No container found with class 'projects'.");
            return;
        }
        projectsTitle.textContent = `${projects.length} Projects`;
        renderProjects(projects, projectsContainer, 'h2');
    } catch (error) {
        console.error("Error loading projects:", error);
    }
}

loadProjects();
