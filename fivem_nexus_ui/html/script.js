document.addEventListener("DOMContentLoaded", () => {
    const app = document.getElementById("app");
    
    // NUI Event Listener
    window.addEventListener("message", function(event) {
        const item = event.data;
        if (item.type === "ui") {
            if (item.status) {
                app.classList.remove("hidden");
                updateData(item.data);
            } else {
                app.classList.add("hidden");
            }
        }
    });

    // Handle Escape key
    document.onkeyup = function (data) {
        if (data.which == 27) { // ESC key
            closeUI();
        }
    };

    // Handle close buttons
    document.getElementById("close-icon").addEventListener("click", closeUI);
    document.getElementById("close-btn").addEventListener("click", closeUI);

    function closeUI() {
        app.classList.add("hidden");
        fetch(`https://${GetParentResourceName()}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
    }

    function updateData(data) {
        if(!data) return;
        
        document.getElementById("val-name").textContent = data.playerName || "-";
        document.getElementById("val-identifier").textContent = data.identifier || "-";
        document.getElementById("val-job").textContent = data.job || "Ismeretlen";
        
        document.getElementById("val-cash").textContent = formatMoney(data.cash || 0);
        document.getElementById("val-bank").textContent = formatMoney(data.bank || 0);
        document.getElementById("val-pp").textContent = formatNumber(data.pp || 0);
    }

    function formatMoney(amount) {
        return "$" + parseInt(amount).toLocaleString('en-US');
    }

    function formatNumber(amount) {
        return parseInt(amount).toLocaleString('en-US');
    }
});
