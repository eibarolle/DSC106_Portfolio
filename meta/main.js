let data = [];

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: +row.line,
        depth: +row.depth,
        length: +row.length,
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    displayStats();
}

document.addEventListener('DOMContentLoaded', function () {
    loadData().then(createScatterplot);
});

let commits = [];

function processCommits() {
    commits = d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;

        let ret = {
            id: commit,
            url: `https://github.com/eibarolle/DSC106_Portfolio/commit/${commit}`,
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
            enumerable: true,
            writable: true,
            configurable: true,
        });

        return ret;
    });
}

function displayStats() {
    processCommits();
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    dl.append('dt').text('Total Commits');
    dl.append('dd').text(commits.length);

    dl.append('dt').text('Number of Files');
    dl.append('dd').text(d3.group(data, (d) => d.file).size);

    dl.append('dt').text('Max Depth');
    dl.append('dd').text(d3.max(data, d => +d.depth));

    dl.append('dt').text('Average Line Length');
    dl.append('dd').text(data.length > 0 ? Math.round(d3.sum(data, d => +d.length) /data.length) : 0);
}

function createScatterplot() {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };
    const svg = d3.select('#chart').append('svg').attr('viewBox', `0 0 ${width} ${height}`).style('overflow', 'visible');
    const xScale = d3.scaleTime().domain(d3.extent(commits, (d) => d.datetime)).range([0, width]).nice();
    const yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);
    const dots = svg.append('g').attr('class', 'dots');
    dots.selectAll('circle').data(commits).join('circle').attr('cx', (d) => xScale(d.datetime)).attr('cy', (d) => yScale(d.hourFrac)).attr('r', 5).attr('fill', 'steelblue');
    console.log(dots);
    // Add gridlines BEFORE the axes
    const gridlines = svg.append('g').attr('class', 'gridlines').attr('transform', `translate(${usableArea.left}, 0)`);
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width)).selectAll("line").attr("stroke", "lightgray").attr("stroke-dasharray", "2,2");
    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
    svg.append('g').attr('transform', `translate(0, ${usableArea.bottom})`).call(xAxis);
    svg.append('g').attr('transform', `translate(${usableArea.left}, 0)`).call(yAxis);
    dots
    .on('mouseenter', (event, commit) => {
        updateTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
    })
    .on('mouseleave', () => {
        updateTooltipContent({});
        updateTooltipVisibility(false);
    });
    console.log(commits[0])
}

function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    console.log(commit);
    if (Object.keys(commit).length === 0) return;
  
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    console.log(isVisible)
    tooltip.hidden = !isVisible;
  }
  
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}