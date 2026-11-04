const $ = (id) => document.getElementById(id);

async function getJSON(url) {
	const res = await fetch(url);
	const body = await res.json();
	if (!res.ok) throw new Error(body.error || res.statusText);
	return body;
}

async function load() {
	const me = await getJSON("/me");
	for (const p of ["spotify", "deezer"]) {
		const name = p[0].toUpperCase() + p.slice(1);
		$(p).textContent = (me.connected[p] ? `${name} connected` : `Connect ${name}`) + (me.mock[p] ? " (mock)" : "");
	}
	const any = me.connected.spotify || me.connected.deezer;
	$("logout").hidden = !any;
	if (any) {
		const profile = await getJSON("/me/profile");
		$("profile").textContent =
			`Top artists: ${profile.topArtists.slice(0, 5).join(", ") || "none"}. ` +
			`Top genres: ${profile.topGenres.slice(0, 5).join(", ") || "none"}.`;
	}
}

$("form").addEventListener("submit", async (e) => {
	e.preventDefault();
	$("status").textContent = "Loading…";
	$("results").replaceChildren();
	try {
		const data = await getJSON(`/recommendations?instrument=${$("instrument").value}`);
		$("status").textContent = data.items.length ? "" : "No tracks found in your profile yet.";
		for (const item of data.items) {
			const li = document.createElement("li");
			li.append(`${item.artist} – ${item.title} `);
			for (const link of item.links) {
				const a = document.createElement("a");
				a.href = link.url;
				a.textContent = link.site;
				a.target = "_blank";
				a.rel = "noopener";
				li.append(" · ", a);
			}
			$("results").append(li);
		}
	} catch (err) {
		$("status").textContent = err.message;
	}
});

$("logout").addEventListener("click", async () => {
	await fetch("/auth/logout", { method: "POST" });
	location.reload();
});

load().catch((err) => ($("status").textContent = err.message));
