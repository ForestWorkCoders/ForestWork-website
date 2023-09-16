function generateSurveyHTML(month, year, endDate, times=16) {
  return `
    <span class="survey-country list-only">
      ${month.toUpperCase()}
    </span>
    
    <span class="survey-name">
      ${year} 林間盃 ${month}月份 日麻積分賽
    </span>
    
    <span class="survey-country grid-only">
      ${month.toUpperCase()}
    </span>
  
    <div class="pull-right">
      <span class="survey-progress">
        <span class="survey-progress-bg">
          <span class="survey-progress-fg" style="width: 100%;"></span>
        </span>
        
        <span class="survey-progress-labels">
          <span class="survey-progress-label">
            100%
          </span>

          <span class="survey-completes">
            ${times} / ${times}
          </span>
        </span>
      </span>
      
      <span class="survey-end-date">
        ${year} - ${month} ${endDate}
      </span>
      
      <span class="survey-stage">
        <span class="stage draft">Draft</span>
        <span class="stage awarded">Awarded</span>
        <span class="stage live">Live</span>
        <span class="stage ended active">Ended</span>        
      </span>
    </div>
  `;
}

document.getElementById('Jan2022').innerHTML = generateSurveyHTML('Feb', 2022, 23, 24);
document.getElementById('Feb2022').innerHTML = generateSurveyHTML('Feb', 2022, 23);
document.getElementById('Mar2022').innerHTML = generateSurveyHTML('Mar', 2022, 30);
document.getElementById('Apr2022').innerHTML = generateSurveyHTML('Apr', 2022, 27);
document.getElementById('May2022').innerHTML = generateSurveyHTML('May', 2022, 25);
document.getElementById('Jun2022').innerHTML = generateSurveyHTML('Jun', 2022, 29);
document.getElementById('Jul2022').innerHTML = generateSurveyHTML('Jul', 2022, 27);
document.getElementById('Aug2022').innerHTML = generateSurveyHTML('Aug', 2022, 31);
document.getElementById('Sep2022').innerHTML = generateSurveyHTML('Sep', 2022, 28);
document.getElementById('Nov2022').innerHTML = generateSurveyHTML('Nov', 2022, 30);
document.getElementById('Dec2022').innerHTML = generateSurveyHTML('Dec', 2022, 30, 12);
document.getElementById('Jan2023').innerHTML = generateSurveyHTML('Jan', 2023, 25);
document.getElementById('Feb2023').innerHTML = generateSurveyHTML('Feb', 2023, 22);
document.getElementById('Mar2023').innerHTML = generateSurveyHTML('Mar', 2023, 29);
document.getElementById('Apr2023').innerHTML = generateSurveyHTML('Apr', 2023, 26);
document.getElementById('May2023').innerHTML = generateSurveyHTML('May', 2023, 31);
document.getElementById('Jun2023').innerHTML = generateSurveyHTML('Jun', 2023, 28);
document.getElementById('Jul2023').innerHTML = generateSurveyHTML('Jul', 2023, 26);
document.getElementById('Aug2023').innerHTML = generateSurveyHTML('Aug', 2023, 30);