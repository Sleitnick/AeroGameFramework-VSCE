console.log("Test");

const testElement = document.getElementById("test");

let i = 0;
setInterval(() => {
	i++;
	testElement.innerHTML = "Hello from JS " + i;
}, 500);