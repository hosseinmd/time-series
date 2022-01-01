import * as tf from "@tensorflow/tfjs";
import { makePredictions, trainModel } from "./model";
//@ts-ignore
import macd from "macd";
let input_dataset = [];
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
let trainingsize = 70;
let data_temporal_resolutions = "Weekly";

function onClickFetchData() {
  let ticker = "MSFT";
  let apikey = "DUMLE12T0SWDSOWT";

  // $("#btn_fetch_data").hide();
  // $("#load_fetch_data").show();

  let requestUrl = "";
  if (data_temporal_resolutions == "Daily") {
    requestUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${ticker}&apikey=${apikey}`;
  } else {
    requestUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=${ticker}&apikey=${apikey}`;
    // "https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=" +
    // ticker +
    // "&apikey=" +
    // apikey;
  }

  return fetch(requestUrl)
    .then((res) => res.json())
    .then(function (data) {
      console.log({ data });

      // let data = gotten_data_raw;
      // console.log(12, JSON.stringify(data))
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

        // $("#btn_fetch_data").show();
        // $("#load_fetch_data").hide();
        // $("#div_linegraph_data_title").text();
        console.log({ message });

        if (data_raw.length > 0) {
          let prices: [number, number][] = data_raw.map(function (val) {
            return [new Date(val["timestamp"]).getTime(), val["price"]];
          });

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
    // output: displayTrainingData(),
    sma,
    actualPrices,
  };
}
function displayMacd() {
  Macd = macd(data_raw.slice(window_size).map((e) => e.price)).MACD;
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
// function displayTrainingData() {
//   let set = sma_vec.map(function (val) {
//     return val["set"];
//   });
//   let data_output = "";
//   for (let index = 0; index < 25; index++) {
//     data_output +=
//       '<tr><td width="20px">' +
//       (index + 1) +
//       "</td><td>[" +
//       set[index]
//         .map(function (val: any) {
//           return (Math.round(val["price"] * 10000) / 10000).toString();
//         })
//         .toString() +
//       "]</td><td>" +
//       sma_vec[index]["avg"] +
//       "</td></tr>";
//   }

//   data_output =
//     "<table class='striped'>" +
//     "<thead><tr><th scope='col'>#</th>" +
//     "<th scope='col'>Input (X)</th>" +
//     "<th scope='col'>Label (Y)</th></thead>" +
//     "<tbody>" +
//     data_output +
//     "</tbody>" +
//     "</table>";

//   return data_output;
// }

async function onClickTrainModel() {
  let epoch_loss: any[] = [];
  console.log(sma_vec);
  // $("#div_container_training").show();
  // $("#btn_draw_trainmodel").hide();

  // document.getElementById("div_traininglog").innerHTML = "";

  let inputs = sma_vec.map(function (inp_f) {
    return inp_f["set"].map(function (val: any, idx: number) {
      return val["price"];
    });
  });

  let outputs = sma_vec.map(function (outp_f) {
    return outp_f["avg"];
  });

  trainingsize = 99;
  let n_epochs = 10;
  let learningrate = 0.01;
  let n_hiddenlayers = 1;

  inputs = inputs.slice(0, Math.floor((trainingsize / 100) * inputs.length));
  outputs = outputs.slice(0, Math.floor((trainingsize / 100) * outputs.length));

  let callback = function (epoch: any, log: any) {
    let logHtml = document.getElementById("div_traininglog")!.innerHTML;
    logHtml =
      "<div>Epoch: " +
      (epoch + 1) +
      " (of " +
      n_epochs +
      ")" +
      ", loss: " +
      log.loss +
      // ", difference: " + (epoch_loss[epoch_loss.length-1] - log.loss) +
      "</div>" +
      logHtml;

    epoch_loss.push(log.loss);

    document.getElementById("div_traininglog")!.innerHTML = logHtml;
    document.getElementById("div_training_progressbar")!.style.width =
      Math.ceil((epoch + 1) * (100 / n_epochs)).toString() + "%";
    document.getElementById("div_training_progressbar")!.innerHTML =
      Math.ceil((epoch + 1) * (100 / n_epochs)).toString() + "%";

    // let graph_plot = document.getElementById("div_linegraph_trainloss");
    // Plotly.newPlot(
    //   graph_plot,
    //   [
    //     {
    //       x: Array.from({ length: epoch_loss.length }, (v, k) => k + 1),
    //       y: epoch_loss,
    //       name: "Loss",
    //     },
    //   ],
    //   { margin: { t: 0 } }
    // );
  };

  console.log("train X", inputs);
  console.log("train Y", outputs);
  result = await trainModel(
    inputs,
    outputs,
    window_size,
    n_epochs,
    learningrate,
    n_hiddenlayers,
    callback
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

  let timestamps_a = data_raw.map(function (val) {
    return val["timestamp"];
  });
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
  let prices = data_raw.map(function (val) {
    return val["price"];
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

  // let graph_plot = document.getElementById("div_prediction_graph");
  return {
    latestTrends,
    predictedPrice,
  };
  // Plotly.newPlot(
  //   graph_plot,
  //   [{ x: timestamps_d, y: pred_X[0], name: "Latest Trends" }],
  //   { margin: { t: 0 } }
  // );
  // Plotly.plot(
  //   graph_plot,
  //   [{ x: timestamps_e, y: pred_y, name: "Predicted Price" }],
  //   { margin: { t: 0 } }
  // );

  // $("#load_predicting").hide();
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

// data_raw = gotten_data_raw;
