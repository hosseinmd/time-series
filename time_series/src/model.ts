import * as tf from "@tensorflow/tfjs";
import * as tfvis from "@tensorflow/tfjs-vis";

export async function trainModel(
  X: any[],
  Y: any[],
  window_size: any,
  n_epochs: any,
  learning_rate: number | undefined,
  n_layers: number
) {
  const batch_size = 32;

  const input_layer_shape = window_size;

  const rnn_output_neurons = 16;

  const output_layer_shape = rnn_output_neurons;
  const output_layer_neurons = 1;

  const inputTensor = tf
    .tensor2d(X, [X.length, X[0].length])
    .reshape([X.length, X[0].length, 1]);
  const labelTensor = tf.tensor2d(Y, [Y.length, 1]).reshape([Y.length, 1]);

  const [xs, inputMax, inputMin] = normalizeTensorFit(inputTensor);
  const [ys, labelMax, labelMin] = normalizeTensorFit(labelTensor);

  const model = tf.sequential();
  console.log(inputTensor.shape);

  model.add(
    tf.layers.conv1d({
      filters: 64,
      kernelSize: 6,
      inputShape: [10, 1],
    })
  );

  model.add(
    tf.layers.lstm({
      units: 72,
      activation: "relu",
      returnSequences: true,
      inputShape: [input_layer_shape],
    })
  );
  model.add(
    tf.layers.lstm({ units: 48, activation: "relu", returnSequences: false })
  );

  model.add(
    tf.layers.dense({
      units: output_layer_neurons,
      inputShape: [output_layer_shape],
    })
  );

  model.compile({
    optimizer: tf.train.adam(learning_rate),
    loss: tf.losses.huberLoss,
  });
  console.log(model.summary());

  const hist = await model.fit(xs, ys, {
    batchSize: batch_size,
    epochs: n_epochs,
    callbacks: tfvis.show.fitCallbacks(
      { name: "model trainig results" },
      ["loss"],
      { height: 300, callbacks: ["onEpochEnd"] }
    ),
  });

  return {
    model: model,
    stats: hist,
    normalize: {
      inputMax: inputMax,
      inputMin: inputMin,
      labelMax: labelMax,
      labelMin: labelMin,
    },
  };
}

export function makePredictions(
  X: any[],
  model: { predict: (arg0: any) => any },
  dict_normalize: { [x: string]: any }
) {
  const X2d = tf
    .tensor2d(X, [X.length, X[0].length])
    .reshape([X.length, X[0].length, 1]);
  const normalizedInput = normalizeTensor(
    X2d,
    dict_normalize["inputMax"],
    dict_normalize["inputMin"]
  );
  const model_out = model.predict(normalizedInput);
  const predictedResults = unNormalizeTensor(
    model_out,
    dict_normalize["labelMax"],
    dict_normalize["labelMin"]
  );

  return Array.from(predictedResults.dataSync());
}

function normalizeTensorFit(tensor: tf.Tensor<tf.Rank>) {
  const maxval = tensor.max();
  const minval = tensor.min();
  const normalizedTensor = normalizeTensor(tensor, maxval, minval);
  return [normalizedTensor, maxval, minval];
}

function normalizeTensor(
  tensor: tf.Tensor2D | tf.Tensor<tf.Rank>,
  maxval: tf.Tensor<tf.Rank>,
  minval: tf.Tensor<tf.Rank>
) {
  const normalizedTensor = tensor.sub(minval).div(maxval.sub(minval));
  return normalizedTensor;
}

function unNormalizeTensor(
  tensor: tf.Tensor2D,
  maxval: tf.Tensor<tf.Rank>,
  minval: tf.Tensor<tf.Rank>
) {
  const unNormTensor = tensor.mul(maxval.sub(minval)).add(minval);
  return unNormTensor;
}
