import * as tf from "@tensorflow/tfjs";
import { makePredictions, trainModel } from "./model";
//@ts-ignore
import macd from "macd";
let result: {
  model: tf.Sequential;
  stats: tf.History;
  normalize: {
    inputMax: tf.Tensor<tf.Rank>;
    inputMin: tf.Tensor<tf.Rank>;
    labelMax: tf.Tensor<tf.Rank>;
    labelMin: tf.Tensor<tf.Rank>;
  };
};
let Macd: any[];
let data_raw: any[] = [];
let sma_vec: any[] = [];
let window_size = 10;
let trainingsize = 96;
let data_temporal_resolutions = "Weekly";
let pricesList: [number, number][];
function onClickFetchData() {
  let ticker = "USD";
  let apikey = "DUMLE12T0SWDSOWT";

  let requestUrl = "";
  if (data_temporal_resolutions == "Daily") {
    requestUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${ticker}&apikey=${apikey}`;
  } else {
    requestUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=${ticker}&apikey=${apikey}&outputsize=compact`;
  }

  return fetch(requestUrl)
    .then((res) => res.json())
    .then(function (data) {
      console.log({ data });

      let message = "";

      let daily = [];
      if (data_temporal_resolutions == "Daily") {
        daily = data["Time Series (Daily)"];
      } else {
        daily = data["Weekly Adjusted Time Series"];
      }

      if (daily) {
        let symbol = data["Meta Data"]["2. Symbol"];
        let last_refreshed = data["Meta Data"]["3. Last Refreshed"];

        data_raw = [];
        sma_vec = [];

        let index = 0;
        for (let date in daily) {
          data_raw.push({
            timestamp: date,
            price: parseFloat(daily[date]["5. adjusted close"]),
          });
          index++;
        }

        data_raw.reverse();
        console.log(`data_raw`, data_raw);

        message =
          "Symbol: " + symbol + " (last refreshed " + last_refreshed + ")";

        console.log({ message });

        if (data_raw.length > 0) {
          let prices: [number, number][] = data_raw.map(function (val) {
            return [new Date(val["timestamp"]).getTime(), val["price"]];
          });
          pricesList = prices;
          return {
            prices,
            data_raw,
          };
        }
      } else {
      }
      return {};
    });
}

function onClickDisplaySMA() {
  sma_vec = ComputeSMA(data_raw, window_size);

  let timestamps_b = [...data_raw].splice(window_size, data_raw.length);

  let sma: [number, number][] = sma_vec.map(function (val, index) {
    return [new Date(timestamps_b[index]["timestamp"]).getTime(), val["avg"]];
  });

  let actualPrices: [number, number][] = data_raw.map(function (val) {
    return [new Date(val["timestamp"]).getTime(), val["price"]];
  });

  return {
    sma,
    actualPrices,
  };
}
function displayMacd() {
  Macd = macd(data_raw.slice(window_size).map((e) => e.price)).signal;
  let timestamps_b = [...data_raw].splice(window_size, data_raw.length);
  Macd = Macd.map((e, i) => [
    new Date(timestamps_b[i]["timestamp"]).getTime(),
    e,
  ]);
  console.log(Macd);
  let actualPrices: [number, number][] = data_raw.map(function (val) {
    return [new Date(val["timestamp"]).getTime(), val["price"]];
  });
  return { Macd, actualPrices };
}

async function onClickTrainModel() {
  let epoch_loss: any[] = [];
  console.log(sma_vec);

  let inputs = sma_vec.map(function (inp_f) {
    return inp_f["set"].map(function (val: any, idx: number) {
      return val["price"];
    });
  });

  let outputs = sma_vec.map(function (outp_f) {
    return outp_f["avg"];
  });

  let n_epochs = 10;
  let learningrate = 0.01;
  let n_hiddenlayers = 1;

  inputs = inputs.slice(0, Math.floor((trainingsize / 100) * inputs.length));
  outputs = outputs.slice(0, Math.floor((trainingsize / 100) * outputs.length));

  console.log("train X", inputs);
  console.log("train Y", outputs);
  result = await trainModel(
    inputs,
    outputs,
    window_size,
    n_epochs,
    learningrate,
    n_hiddenlayers
  );

  let logHtml = document.getElementById("div_traininglog")!.innerHTML;
  logHtml = "<div>Model train completed</div>" + logHtml;
  document.getElementById("div_traininglog")!.innerHTML = logHtml;
}

function onClickValidate() {
  let inputs = sma_vec.map(function (inp_f) {
    return inp_f["set"].map(function (val: any) {
      return val["price"];
    });
  });

  let val_train_x = inputs.slice(
    0,
    Math.floor((trainingsize / 100) * inputs.length)
  );

  let val_train_y = makePredictions(
    val_train_x,
    result["model"],
    result["normalize"]
  );

  let val_unseen_x = inputs.slice(
    Math.floor((trainingsize / 100) * inputs.length),
    inputs.length
  );
  // console.log('val_unseen_x', val_unseen_x)
  let val_unseen_y = makePredictions(
    val_unseen_x,
    result["model"],
    result["normalize"]
  );
  // console.log('val_unseen_y', val_unseen_y)

  let timestamps_a = pricesList.map(function (val) {
    return val[0];
  });
  console.log(data_raw);
  let timestamps_b = data_raw
    .map(function (val) {
      return val["timestamp"];
    })
    .splice(
      window_size,
      data_raw.length -
        Math.floor(((100 - trainingsize) / 100) * data_raw.length)
    );
  let timestamps_c = data_raw
    .map(function (val) {
      return val["timestamp"];
    })
    .splice(
      window_size + Math.floor((trainingsize / 100) * inputs.length),
      inputs.length
    );

  let sma = sma_vec.map(function (val) {
    return val["avg"];
  });
  let prices = pricesList.map(function (val) {
    return val[1];
  });

  sma = sma.slice(0, Math.floor((trainingsize / 100) * sma.length));
  // console.log('sma', sma)
  console.log({
    timestamps_a: { x: timestamps_a, y: prices, name: "Actual Price" },
    timestamps_b: { x: timestamps_b, y: sma, name: "Training Label (SMA)" },
    predictedTimestamps_b: {
      x: timestamps_b,
      y: val_train_y,
      name: "Predicted (train)",
    },
    predictedTimestamps_c: {
      x: timestamps_c,
      y: val_unseen_y,
      name: "Predicted (test)",
    },
  });
  return {
    timestamps_a: { x: timestamps_a, y: prices, name: "Actual Price" },
    timestamps_b: { x: timestamps_b, y: sma, name: "Training Label (SMA)" },
    predictedTimestamps_b: {
      x: timestamps_b,
      y: val_train_y,
      name: "Predicted (train)",
    },
    predictedTimestamps_c: {
      x: timestamps_c,
      y: val_unseen_y,
      name: "Predicted (test)",
    },
  };
}

async function onClickPredict() {
  let inputs = sma_vec.map(function (inp_f) {
    return inp_f["set"].map(function (val: any) {
      return val["price"];
    });
  });
  let pred_X = [inputs[inputs.length - 1]];
  pred_X = pred_X.slice(
    Math.floor((trainingsize / 100) * pred_X.length),
    pred_X.length
  );
  let pred_y = makePredictions(pred_X, result["model"], result["normalize"]);

  let timestamps_d = data_raw.splice(
    data_raw.length - window_size,
    data_raw.length
  );

  // date
  let last_date = new Date(timestamps_d[timestamps_d.length - 1]["timestamp"]);
  let add_days = 1;
  if (data_temporal_resolutions == "Weekly") {
    add_days = 7;
  }
  last_date.setDate(last_date.getDate() + add_days);
  let next_date = await formatDate(last_date.toString());
  let timestamps_e = [next_date];

  let latestTrends: [number, number][] = timestamps_d.map(function (
    val,
    index
  ) {
    return [new Date(val["timestamp"]).getTime(), pred_X[0][index]];
  });

  let predictedPrice: [number, number][] = pred_y.map(function (val, index) {
    return [new Date(timestamps_e[index]).getTime(), val];
  });

  console.log({ predictedPrice, pred_y, latestTrends });

  return {
    latestTrends,
    predictedPrice,
  };
}

function ComputeSMA(data: any[], window_size: number) {
  let r_avgs = [],
    avg_prev = 0;
  for (let i = 0; i < data.length - window_size; i++) {
    let curr_avg = 0.0,
      t = i + window_size;
    for (let k = i; k < t && k <= data.length; k++) {
      curr_avg += data[k]["price"] / window_size;
    }
    r_avgs.push({ set: data.slice(i, i + window_size), avg: curr_avg });
    avg_prev = curr_avg;
  }
  return r_avgs;
}

function formatDate(date: any) {
  var d = new Date(date),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
}

//////

export {
  onClickFetchData,
  onClickDisplaySMA,
  onClickTrainModel,
  onClickPredict,
  displayMacd,
  onClickValidate,
};
