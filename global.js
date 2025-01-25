console.log('IT’S ALIVE!');

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

// const navLinks = $$('nav a');

// let currentLink = navLinks.find(
//     (a) => a.host === location.host && a.pathname === location.pathname
// );

// currentLink?.classList.add('current');

let pages = [
        {url: '', title: 'Home' },
        {url: 'contact/', title: 'Contact' },
        {url: 'projects/', title: 'Projects' },
        {url: 'resume/', title: 'Resume' },
        {url: 'https://github.com/eibarolle', title: 'GitHub' }
    ];
    
    let nav = document.createElement('nav');
    document.body.prepend(nav);
    
    const ARE_WE_HOME = document.documentElement.classList.contains('home');
    
    for (let p of pages) {
        let url = p.url;
        let title = p.title;

        url = !ARE_WE_HOME && !url.startsWith('http') ? '../' + url : url;
    
        let a = document.createElement('a');
        a.href = url;
        a.textContent = title;
        nav.append(a);
        if (a.host === location.host && a.pathname === location.pathname) {
            a.classList.add('current');
        }
        if (a.host !== location.host) {
        a.target = '_blank';
        }
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>`
);

const select = document.querySelector('.color-scheme select');

// Check for saved preference and apply it
if ('colorScheme' in localStorage) {
  const savedScheme = localStorage.colorScheme;
  document.documentElement.style.setProperty('color-scheme', savedScheme);
  select.value = savedScheme;
}

// Listen for changes and update the theme
select.addEventListener('input', function (event) {
  const value = event.target.value;

  // Set the color-scheme property
  document.documentElement.style.setProperty('color-scheme', value);

  // Save the preference in localStorage
  localStorage.colorScheme = value;
});