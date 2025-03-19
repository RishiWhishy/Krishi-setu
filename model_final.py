import pandas as pd
# import matplotlib.pyplot as plt
from statsmodels.tsa.arima.model import ARIMA

#main model
file_path = 'c:/extracted_datasets/potato/final_potato_dataset.xlsx'  
data = pd.read_excel(file_path)
data_ffill = data.ffill()
numeric_data = data_ffill.iloc[:, 1:]
average_prices = numeric_data.mean(axis=0)
print("Average prices calculated successfully:")
print(average_prices)
model = ARIMA(average_prices, order=(5,1,0))  
model_fit = model.fit()
print("Model fitted successfully.")
forecast_steps = 3  
forecast = model_fit.forecast(steps=forecast_steps)
print("\n\nForecast generated successfully.")
forecast_months = ["September, 2024", "October, 2024", "November, 2024"]
forecast_prices = pd.DataFrame({'Month': forecast_months, 'Forecasted Price': forecast})
print("\n\nForecasted prices(Rs/Quintal):")
print(forecast_prices)
# #plot
# last_three_months = data_ffill.columns[-3:]
# plt.figure(figsize=(8, 6))
# for index, row in data_ffill.iterrows():
#     plt.plot(last_three_months, row[last_three_months], label=row['State'])
# plt.title('Potato Price Trends Across States (Last 3 Months)')
# plt.xlabel('Month')
# plt.ylabel('Price (in currency units)')
# plt.xticks(rotation=90)
# plt.legend(loc='upper right', bbox_to_anchor=(1.15, 1.05), ncol=2)
# plt.grid(True)
# plt.tight_layout()
# plt.show()

