let data = [];
let commits = [];
let filteredCommits = [];
let selectedCommits = [];
let xScale, yScale, timeScale, commitMaxTime;
let commitProgress = 100;
const width = 1000;
const height = 600;
const margin = { top: 10, right: 10, bottom: 30, left: 20 };
let NUM_ITEMS;
let ITEM_HEIGHT = 105; 
let VISIBLE_COUNT = 10; 
let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;
const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
spacer.style('height', `${totalHeight}px`);
const itemsContainer = d3.select('#items-container');
scrollContainer.on('scroll', () => {
    const scrollTop = scrollContainer.property('scrollTop');
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
});

const fileScrollContainer = d3.select('#file-sizes-scroll-container');
const fileSpacer = d3.select('#file-sizes-spacer');
fileSpacer.style('height', `${totalHeight}px`);
const fileItemsContainer = d3.select('#file-sizes-items-container');
fileScrollContainer.on('scroll', () => {
    const scrollTop = fileScrollContainer.property('scrollTop');
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderFileSizes(startIndex);
});

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line), 
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    processCommits();
    filteredCommits = commits;
    displayStats(filteredCommits);
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    NUM_ITEMS = commits.length;
    renderItems(0);
    renderFileSizes(0);
    timeScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([0, 100]);
    commitMaxTime = timeScale.invert(commitProgress);
    updateScatterplot(filteredCommits);
    brushSelector();
});

function processCommits() {
    commits = d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;

        let ret = {
            id: commit,
            url: 'https://github.com/eibarolle/DSC106_Portfolio/commit/' + commit,
            author,
            date,
            time,
            timezone,
            datetime,
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
            totalLines: lines.length,
        };

        Object.defineProperty(ret, 'lines', {
            value: lines,
            writable: false,
            enumerable: false,
            configurable: false
        });

        return ret;
    });
}

function displayStats(commits) { 
    d3.select('#stats').selectAll('dl').remove();
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');


    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(d3.sum(commits, d => d.totalLines));

    dl.append('dt').text('Total Commits');
    dl.append('dd').text(commits.length);

    const dataLines = commits.flatMap(d => d.lines);
    dl.append('dt').text('Files');
    dl.append('dd').text(new Set(dataLines.map(d => d.file)).size);

    dl.append('dt').text('Max depth');
    dl.append('dd').text(d3.max(dataLines, d => d.depth) || 0);

    const meanLineLength = dataLines.length > 0 ? d3.mean(dataLines, d => d.length) : 0;
    dl.append('dt').text('Average line length');
    dl.append('dd').text(meanLineLength.toFixed(2));
}

function filterCommitsByTime() {
    if (commitProgress === 100) {
        filteredCommits = commits; 
    } else {
        filteredCommits = commits.filter(
        d => d.datetime <= commitMaxTime
        );
    }
}

function updateScatterplot(commits) {
    d3.select('svg').remove();

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([0, width])
        .nice();
    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt()
        .domain([minLines || 0, maxLines || 0])
        .range([2, 30]);

    svg.selectAll('g').remove();
    const dots = svg.append('g').attr('class', 'dots');


    dots.selectAll('circle').remove();
    dots.selectAll('circle')
        .data(commits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .style('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1);
        d3.select(event.currentTarget).classed('selected', true);
        updateTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        d3.select(event.currentTarget).classed('selected', false);
        updateTooltipContent({});
        updateTooltipVisibility(false);
        });

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);
}


function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (!commit || Object.keys(commit).length === 0) return;
    
    link.href = commit.url;
    link.textContent = commit.id.substring(0, 7); 
    date.textContent = commit.datetime?.toLocaleString('en', {dateStyle: 'full'});
    time.textContent = commit.datetime?.toLocaleTimeString('en', { timeStyle: 'short'});
    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

function brushSelector() {
    const svg = document.querySelector('svg');
    d3.select(svg).call(d3.brush().on('start brush end', brushed));
    d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
}

let brushSelection = null;

function brushed(event) {
    brushSelection = event.selection;

    selectedCommits = !brushSelection
        ? []
        : filteredCommits.filter((commit) => {
            let [[x0, y0], [x1, y1]] = brushSelection;
            let x = xScale(commit.datetime);
            let y = yScale(commit.hourFrac);
            return x >= x0 && x <= x1 && y >= y0 && y <= y1;
        });

    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown();
}


function updateSelection() {
    d3.selectAll('circle')
        .classed('selected', (d) => selectedCommits.includes(d))
        .style('fill', (d) => selectedCommits.includes(d) ? '#ff6b6b' : 'steelblue')
    displayStats(selectedCommits);
}

function updateSelectionCount() {
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
    return selectedCommits;
}

function updateLanguageBreakdown() {
    const container = document.getElementById('language-breakdown');

    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const lines = selectedCommits.flatMap((d) => d.lines);
    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type
    );

    container.innerHTML = '';
    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);

        container.innerHTML += `
        <dt>${language}</dt>
        <dd>${count} lines (${formatted})</dd>
        `;
    }

    return breakdown;
}

function displayCommitFiles(commits) {
    const lines = commits.flatMap((d) => d.lines);
    let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
    let files = d3.groups(lines, (d) => d.file).map(([name, lines]) => {
        return {name, lines};
    });
    files = d3.sort(files, (d) => -d.lines.length);
    d3.select('.files').selectAll('div').remove();
    let filesContainer = d3.select('.files')
        .selectAll('div')
        .data(files)
        .enter()
        .append('div');

    filesContainer.append('dt')
        .append('code')
        .text(d => d.name)
        .append('small')
        .html(d => `<br>${d.lines.length} lines`);
    
    filesContainer.append('dd')
        .selectAll('div')
        .data(d => d.lines)
        .enter()
        .append('div')
        .attr('class', 'line')
        .style('background', (d) => fileTypeColors(d.type));
}

function renderItems(startIndex) {
    itemsContainer.selectAll('div').remove();
    const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
    let newCommitSlice = commits.slice(startIndex, endIndex);
    
    selectedCommits = [];
    if (startIndex === 0) {
        displayStats(commits);
    } else {
        displayStats(newCommitSlice);
    }
    
    updateScatterplot(newCommitSlice);
    updateSelectionCount();
    updateLanguageBreakdown();
    
    itemsContainer.selectAll('div')
        .data(newCommitSlice)
        .enter()
        .append('div')
        .attr('class', 'item')
        .html((commit, index) => `
            <p>
                On ${commit.datetime.toLocaleString("en", 
                    { dateStyle: "full", timeStyle: "short" })}, I made
                    <a href="${commit.url}" target="_blank">
                    ${startIndex + index > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
                </a>. 
                I edited ${commit.totalLines} lines across 
                ${d3.rollups(commit.lines, D => D.length, d => d.file).length} files. 
                Then I looked over all I had made, and I saw that it was very good.
            </p>
    `)
    .style('position', 'absolute')
    .style('top', (_, idx) => `${(startIndex + idx) * ITEM_HEIGHT}px`);
    brushSelector();
}

function renderFileSizes(startIndex) {
    fileItemsContainer.selectAll('div').remove();
    
    const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
    let newCommitSlice = commits.slice(startIndex, endIndex);
    
    displayCommitFiles(newCommitSlice);
    
    fileItemsContainer.selectAll('div')
        .data(newCommitSlice)
        .enter()
        .append('div')
        .attr('class', 'item')
        .html((commit, index) => `
        <p>
            On ${commit.datetime.toLocaleString("en", 
            { dateStyle: "full", timeStyle: "short" })}, I made
            <a href="${commit.url}" target="_blank">
            ${startIndex + index > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
            </a>. I edited ${commit.totalLines} lines across 
            ${d3.rollups(commit.lines, D => D.length, d => d.file).length} files. 
            Then I looked over all I had made, and I saw that it was very good.
        </p>
        `)
        .style('position', 'absolute')
        .style('top', (_, idx) => `${(startIndex + idx) * ITEM_HEIGHT}px`);

}