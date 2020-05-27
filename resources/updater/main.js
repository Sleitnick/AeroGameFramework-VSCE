function getLatestReleaseInfo() {
	return fetch("https://api.github.com/repos/Sleitnick/AeroGameFramework/releases/latest").then((res) => {
		return res.json();
	});
}

const loadingEl = document.getElementById("loading");
const contentEl = document.getElementById("content");
const latestEl = document.getElementById("latest");
const latestDescEl = document.getElementById("latest-desc");

getLatestReleaseInfo().then((release) => {
	loadingEl.style.display = "none";
	latestEl.innerHTML = `Latest AGF release: <a href="${release.html_url}" target="_blank">${release.tag_name}</a>`;
	latestDescEl.innerHTML = release.body.split("\r\n").map((para) => `<p>${para}</p>`).join("");
	contentEl.style.display = "block";
});
