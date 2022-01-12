// @ts-nocheck
import React, { useState } from "react";
import "./App.css";
import {
  onClickFetchData,
  onClickDisplaySMA,
  onClickTrainModel,
  onClickPredict,
  displayMacd,
  onClickValidate,
} from "./machinlearning";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

function App() {
  const [rawPrices, setRawPrices] = useState<[number, number][]>([]);
  const [SMA, setSMA] = useState<[number, number][]>([]);
  const [MACD, setMACD] = useState<number[]>([]);

  const [predictedPrice, setPredictedPrice] = useState<[number, number][]>([]);
  const [latestTrends, setLatestTrends] = useState<[number, number][]>([]);
  const [actualPrice, setActualPrice] = useState<[number, number][]>([]);
  const [validationdata, setValidationdata] = useState<any>();

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
  const onValidationClickHandler = async () => {
    const {
      predictedTimestamps_b,
      predictedTimestamps_c,
      timestamps_a,
      timestamps_b,
    } = onClickValidate();
    setValidationdata({
      predictedTimestamps_b,
      predictedTimestamps_c,
      timestamps_a,
      timestamps_b,
    });
  };

  const onClickTrainHandler = async () => {
    onClickTrainModel();
  };
  const onClickDisplayMacdHandler = async () => {
    const { Macd, actualPrices } = displayMacd();
    setMACD(Macd);
    setActualPrice(actualPrice);
  };

  const onClickPredictHandler = async () => {
    const { predictedPrice, latestTrends } = await onClickPredict();
    setPredictedPrice(predictedPrice || []);
    setLatestTrends(latestTrends || []);
  };
  console.log(rawPrices);
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
  const validationOptions = {
    title: {
      text: "validation",
    },
    xAxis: { type: "datetime" },
    series: [
      {
        name: validationdata?.predictedTimestamps_b?.name,
        data: validationdata?.predictedTimestamps_b?.y,
      },
      {
        name: validationdata?.predictedTimestamps_c?.name,
        data: Array(validationdata?.predictedTimestamps_b?.y?.length || 0)
          .fill(null)
          .concat(validationdata?.predictedTimestamps_c?.y),
      },
      {
        name: validationdata?.timestamps_a?.name,
        data: validationdata?.timestamps_a?.y,
      },
      {
        name: validationdata?.timestamps_b?.name,
        data: validationdata?.timestamps_b?.y,
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
  const macdOptions = {
    title: {
      text: "MACD and Price",
    },
    xAxis: { type: "datetime" },
    series: [
      {
        data: MACD,
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
      <button onClick={onClickDisplayMacdHandler}>Display Macd</button>

      <button onClick={onClickTrainHandler}>Train</button>
      <button onClick={onClickPredictHandler}>Predict</button>
      <button onClick={onValidationClickHandler}>validate</button>

      <HighchartsReact highcharts={Highcharts} options={options} />
      <HighchartsReact highcharts={Highcharts} options={smaOptions} />
      <HighchartsReact highcharts={Highcharts} options={macdOptions} />

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
      <HighchartsReact highcharts={Highcharts} options={validationOptions} />

      <div
        id="div_training_progressbar"
        style={{ height: 20, backgroundColor: "green", width: 0 }}
      ></div>
      <div id="div_traininglog"></div>
    </div>
  );
}

export default App;
