import {fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let projects = [];
let newData = [];
let query = "";
const searchInput = document.querySelector(".searchBar");
let selectedIndex = -1;

async function loadProjects() {
    projects = await fetchJSON("../lib/projects.json");
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
    let filteredProjects = projects;
    if (query) {
        filteredProjects = filterProjects(query);
    }
    if (selectedIndex !== -1) {
        const selectedYear = newData[selectedIndex].label;
        filteredProjects = filteredProjects.filter(project => project.year === selectedYear);
    }
    renderProjects(filteredProjects, projectsContainer, 'h2');
    renderPieChart(filteredProjects);
}

function filterProjects(query) {
    return projects.filter((project) => {
        let values = Object.values(project).join("\n").toLowerCase();
        return values.includes(query.toLowerCase());
    });
}


function renderPieChart(projectsGiven) {
    let svg = d3.select("svg");
    svg.selectAll("*").remove();
    d3.select(".legend").html("");

    let newRolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
    );

    newData = newRolledData.map(([year, count]) => ({
        value: count,
        label: year
    }));
    newData.sort((a, b) => {
        if (b.value !== a.value) {
            return b.value - a.value;  
        }
    });
    const colors = d3.scaleOrdinal(d3.schemeCategory10);

    const sliceGenerator = d3.pie().value((d) => d.value);
    const arcData = sliceGenerator(newData);
    const arc = d3.arc().innerRadius(0).outerRadius(40);

    svg.selectAll("path")
        .data(arcData)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", (_, i) => colors(i))
        .attr("class", (_, i) => (i === selectedIndex ? "selected" : ""))
        .style("cursor", "pointer")
        .on("click", function (_, idx) {
            selectedIndex = selectedIndex === idx.index ? -1 : idx.index; 
            svg.selectAll("path")
                .attr("class", (_, idx) => (idx === selectedIndex ? "selected" : ""));
            d3.selectAll(".legend li")
                .attr("class", (_, idx) => (idx === selectedIndex ? "selected" : ""));
            loadProjects();
        });

    const legend = d3.select(".legend");
    newData.forEach((d, idx) => {
        legend.append("li")
            .attr("style", `--color:${colors(idx)}`)
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
            .attr("class", idx === selectedIndex ? "selected" : "")
            .on("click", () => {
                selectedIndex = selectedIndex === idx ? -1 : idx;
                svg.selectAll("path")
                    .attr("class", (_, idx) => (idx === selectedIndex ? "selected" : ""));
                d3.selectAll(".legend li")
                    .attr("class", (_, idx) => (idx === selectedIndex ? "selected" : ""));
            });
    });
}


searchInput.addEventListener("input", (event) => {
    query = event.target.value;
    const filteredProjects = filterProjects(query);
    console.log(filteredProjects)
    renderProjects(filteredProjects);
    renderPieChart(filteredProjects);
});

loadProjects();