
const API_URL = "http://127.0.0.1:8000/predict";

const form = document.getElementById("predictionForm");
const predictBtn = document.getElementById("predictBtn");
const btnText = document.getElementById("btnText");

const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const successState = document.getElementById("successState");

const errorMessage = document.getElementById("errorMessage");
const predictionName = document.getElementById("predictionName");
const probabilityList = document.getElementById("probabilityList");

let lastPayload = null;

function showState(state) {
    emptyState.classList.add("hidden");
    loadingState.classList.add("hidden");
    errorState.classList.add("hidden");
    successState.classList.add("hidden");

    state.classList.remove("hidden");
}

function getPayload() {
    return {
        latitude: Number(document.getElementById("latitude").value),
        longitude: Number(document.getElementById("longitude").value),
        price: Number(document.getElementById("price").value),
        minimum_nights: Number(document.getElementById("minimum_nights").value),
        number_of_reviews: Number(document.getElementById("number_of_reviews").value),
        reviews_per_month: Number(document.getElementById("reviews_per_month").value),
        calculated_host_listings_count: Number(
            document.getElementById("calculated_host_listings_count").value
        ),
        availability_365: Number(document.getElementById("availability_365").value),
        neighbourhood_group: document.getElementById("neighbourhood_group").value,
        neighbourhood: document.getElementById("neighbourhood").value.trim()
    };
}

function showError(message) {
    errorMessage.textContent = message;
    showState(errorState);
}

function displayProbabilities(probabilities, classes) {
    probabilityList.replaceChildren();

    if (!Array.isArray(probabilities) || probabilities.length === 0) {
        const message = document.createElement("p");
        message.className = "prediction-caption";
        message.textContent = "The API did not return class probabilities.";
        probabilityList.appendChild(message);
        return;
    }

    probabilities.forEach((probability, index) => {
        const numericValue = Number(probability);

        if (!Number.isFinite(numericValue)) return;

        const label = Array.isArray(classes) && classes[index] !== undefined
            ? String(classes[index])
            : `Class ${index + 1}`;

        // Accommodate APIs returning either fractions or percentages.
        const percent = Math.max(
            0,
            Math.min(100, numericValue <= 1 ? numericValue * 100 : numericValue)
        );

        const row = document.createElement("div");
        row.className = "probability-row";

        const labelRow = document.createElement("div");
        labelRow.className = "probability-label";

        const name = document.createElement("span");
        name.textContent = label;

        const value = document.createElement("span");
        value.textContent = `${percent.toFixed(1)}%`;

        labelRow.append(name, value);

        const track = document.createElement("div");
        track.className = "probability-track";

        const fill = document.createElement("div");
        fill.className = "probability-fill";

        track.appendChild(fill);
        row.append(labelRow, track);
        probabilityList.appendChild(row);

        requestAnimationFrame(() => {
            fill.style.width = `${percent}%`;
        });
    });
}

function displayResult(data) {
    const predicted =
        data.Predicted_room_type ??
        data.predicted_room_type ??
        data.prediction ??
        data.predicted_class;

    if (predicted === undefined || predicted === null) {
        throw new Error("The API response did not contain a predicted room type.");
    }

    predictionName.textContent = String(predicted);

    const probabilities =
        data.Probability ??
        data.probability ??
        data.probabilities;

    const classes =
        data.classes ??
        data.class_names;

    displayProbabilities(probabilities, classes);
    showState(successState);
}

async function requestPrediction(payload) {
    predictBtn.disabled = true;
    btnText.textContent = "Analyzing...";
    showState(loadingState);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();

        if (!response.ok) {
            let detail = responseText;

            try {
                const errorData = JSON.parse(responseText);
                detail = errorData.detail
                    ? JSON.stringify(errorData.detail)
                    : responseText;
            } catch {
                // Keep the original response text if it isn't JSON.
            }

            throw new Error(
                `API returned HTTP ${response.status}: ${detail.slice(0, 350)}`
            );
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            throw new Error("The API returned an invalid JSON response.");
        }

        displayResult(data);
    } catch (error) {
        console.error("Prediction error:", error);

        if (error instanceof TypeError) {
            showError(
                "Could not reach FastAPI. Check that the backend is running at " +
                "http://127.0.0.1:8000 and that CORS is enabled."
            );
        } else {
            showError(error.message || "Something went wrong while predicting.");
        }
    } finally {
        predictBtn.disabled = false;
        btnText.textContent = "Predict Room Type";
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    lastPayload = getPayload();
    await requestPrediction(lastPayload);
});

document.getElementById("retryBtn").addEventListener("click", async () => {
    if (lastPayload) {
        await requestPrediction(lastPayload);
    } else {
        showState(emptyState);
    }
});

document.getElementById("resetBtn").addEventListener("click", () => {
    form.reset();
    lastPayload = null;
    showState(emptyState);
});