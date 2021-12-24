import React, { useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import {
  onClickFetchData,
  onClickDisplaySMA,
  onClickTrainModel,
  onClickPredict,
} from "./machinlearning";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

function App() {
  const [rawPrices, setRawPrices] = useState<[number, number][]>([]);
  const [SMA, setSMA] = useState<[number, number][]>([]);
  const [predictedPrice, setPredictedPrice] = useState<[number, number][]>([]);
  const [latestTrends, setLatestTrends] = useState<[number, number][]>([]);
  const [actualPrice, setActualPrice] = useState<[number, number][]>([]);
  const onClickFetchDataHandler = async () => {
    const { data_raw, prices } = await onClickFetchData();

    setRawPrices(prices || []);

    console.log("data_raw", data_raw);
    console.log("prices", prices);
  };

  const onClickDisplaySMAHandler = async () => {
    const { sma, actualPrices } = onClickDisplaySMA();
    setSMA(sma || []);
    setActualPrice(actualPrices || []);
  };

  const onClickTrainHandler = async () => {
    onClickTrainModel();
  };

  const onClickPredictHandler = async () => {
    const { predictedPrice, latestTrends } = await onClickPredict();
    setPredictedPrice(predictedPrice || []);
    setLatestTrends(latestTrends || []);
  };

  const options = {
    title: {
      text: "Price",
    },
    xAxis: { type: "datetime" },
    series: [
      {
        data: rawPrices,
      },
    ],
  };

  const smaOptions = {
    title: {
      text: "SMA and Price",
    },
    xAxis: { type: "datetime" },
    series: [
      {
        data: SMA,
      },
      {
        data: actualPrice,
      },
    ],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }} className="App">
      <button onClick={onClickFetchDataHandler}>Fetch Data</button>
      <button onClick={onClickDisplaySMAHandler}>Display SMA</button>
      <button onClick={onClickTrainHandler}>Train</button>
      <button onClick={onClickPredictHandler}>Predict</button>
      <HighchartsReact highcharts={Highcharts} options={options} />
      <HighchartsReact highcharts={Highcharts} options={smaOptions} />
      <HighchartsReact
        highcharts={Highcharts}
        options={{
          title: {
            text: "latest Trends and predicted Price",
          },
          xAxis: { type: "datetime" },
          series: [
            {
              data: latestTrends,
            },
            {
              data: predictedPrice,
            },
          ],
        }}
      />

      <div
        id="div_training_progressbar"
        style={{ height: 20, backgroundColor: "green", width: 0 }}
      ></div>
      <div id="div_traininglog"></div>
    </div>
  );
}

export default App;
