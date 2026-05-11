      const HISTORY_API = 'https://carradio-monitor.com/api/history';
        let chart;
        let rawData = [];

        async function fetchData() {
            const loader = document.getElementById('loading');
            loader.style.display = 'flex';
            try {
                const response = await fetch(HISTORY_API);
                rawData = await response.json();
                rawData.sort((a, b) => new Date(a.Date) - new Date(b.Date));
                
                adjustDatePicker();
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                loader.style.display = 'none';
            }
        }

        function getISOWeek(d) 
        {
            const validDate = (d && !isNaN(d.getTime())) ? d : new Date();
            const date = new Date(Date.UTC(validDate.getUTCFullYear(), validDate.getUTCMonth(), validDate.getUTCDate()));
            date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
            const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
            return { year: date.getUTCFullYear(), week: weekNo };
        }

        function getDateFromWeek(weekStr) {
            if (!weekStr || !weekStr.includes('-W')) return new Date();
            const [y, w] = weekStr.split('-W').map(Number);
            const simple = new Date(Date.UTC(y, 0, 1 + (w - 1) * 7));
            const dow = simple.getUTCDay();
            const ISOweekStart = simple;
            if (dow <= 4) ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
            else ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
            return ISOweekStart;
        }

        function adjustDatePicker() {
            const range = document.getElementById('rangeSelect').value;
            const datePicker = document.getElementById('datePicker');
            const val = datePicker.value;
            
            let d;
            if (val) {
                if (val.includes('-W')) {
                    d = getDateFromWeek(val);
                } else if (val.length === 7 && val.includes('-')) {
                    const [y, m] = val.split('-').map(Number);
                    d = new Date(Date.UTC(y, m - 1, 1));
                } else if (val.length === 4 && !isNaN(val)) {
                    d = new Date(Date.UTC(val, 0, 1));
                } else {
                    d = new Date(val);
                }
            } else if (rawData.length > 0) {
                d = new Date(rawData[rawData.length - 1].Date);
            } else {
                d = new Date();
            }

            if (!d || isNaN(d.getTime())) d = new Date();

            if (range === 'year') {
                datePicker.type = 'number';
                datePicker.value = d.getUTCFullYear();
                datePicker.min = 2020;
                datePicker.max = 2100;
            } else if (range === 'month') {
                datePicker.type = 'month';
                datePicker.value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
            } else if (range === 'week') {
                datePicker.type = 'week';
                const info = getISOWeek(d);
                const isoWeek = String(info.week).padStart(2, '0');
                datePicker.value = `${info.year}-W${isoWeek}`;
            } else {
                datePicker.type = 'date';
                datePicker.value = d.toISOString().split('T')[0];
            }
            updateChart();
        }

        function updateChart() {
            const range = document.getElementById('rangeSelect').value;
            const metric = document.getElementById('metricSelect').value;
            const metricLabel = document.getElementById('metricSelect').options[document.getElementById('metricSelect').selectedIndex].text;
            
            if (rawData.length === 0) return;

            if (chart) {
                chart.destroy();
                chart = null;
            }

            const chartCanvas = document.getElementById('historyChart');
            const statsDiv = document.getElementById('statsDisplay');
            
            const selectedDateValue = document.getElementById('datePicker').value;
            if (!selectedDateValue) return;

            let refDate;
            if (range === 'year') {
                refDate = new Date(Date.UTC(selectedDateValue, 0, 1));
            } else if (range === 'week') {
                refDate = getDateFromWeek(selectedDateValue);
            } else {
                refDate = new Date(selectedDateValue);
            }

            const targetYear = refDate.getUTCFullYear();
            const targetMonth = refDate.getUTCMonth();
            let labels = [];
            let values = [];
            let titleSuffix = "";

            if (range === 'year') {
                labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                titleSuffix = `(${targetYear})`;
                values = labels.map((_, i) => {
                    const entries = rawData.filter(d => {
                        const dDate = new Date(d.Date);
                        return dDate.getUTCFullYear() === targetYear && dDate.getUTCMonth() === i;
                    });
                    if (entries.length === 0) return null;
                    const sum = entries.reduce((acc, curr) => acc + curr[metric], 0);
                    return (sum / entries.length).toFixed(1);
                });
            } else if (range === 'month') {
                labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
                const daysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
                if (daysInMonth > 28) labels.push("Week 5");
                
                const monthName = refDate.toLocaleString('default', { month: 'long', timeZone: 'UTC' });
                titleSuffix = `(${monthName} ${targetYear})`;

                values = labels.map((_, i) => {
                    const startDay = i * 7 + 1;
                    const endDay = Math.min((i + 1) * 7, daysInMonth);
                    const entries = rawData.filter(d => {
                        const dDate = new Date(d.Date);
                        return dDate.getUTCFullYear() === targetYear && 
                               dDate.getUTCMonth() === targetMonth && 
                               dDate.getUTCDate() >= startDay && 
                               dDate.getUTCDate() <= endDay;
                    });
                    if (entries.length === 0) return null;
                    const sum = entries.reduce((acc, curr) => acc + (curr[metric] || 0), 0);
                    return (sum / entries.length).toFixed(1);
                });
            } else if (range === 'week') {
                labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                const day = refDate.getUTCDay();
                const diff = refDate.getUTCDate() - day;
                const startDate = new Date(Date.UTC(targetYear, targetMonth, diff));
                titleSuffix = `(Week of ${startDate.toLocaleDateString()})`;

                values = labels.map((_, i) => {
                    const currentDay = new Date(startDate);
                    currentDay.setUTCDate(startDate.getUTCDate() + i);
                    const entry = rawData.find(d => {
                        const dDate = new Date(d.Date);
                        return dDate.getUTCFullYear() === currentDay.getUTCFullYear() &&
                               dDate.getUTCMonth() === currentDay.getUTCMonth() &&
                               dDate.getUTCDate() === currentDay.getUTCDate();
                    });
                    return entry ? entry[metric] : null;
                });
            } else {
                chartCanvas.style.display = 'none';
                statsDiv.style.display = 'grid';

                const dateStr = refDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const entry = rawData.find(d => {
                    const dDate = new Date(d.Date);
                    return dDate.getUTCFullYear() === targetYear && 
                           dDate.getUTCMonth() === targetMonth && 
                           dDate.getUTCDate() === refDate.getUTCDate();
                });

                if (entry) {
                    const createStatCard = (label, value, unit, iconPath) => `
                        <div class="stat-box">
                            <div class="stat-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    ${iconPath}
                                </svg>
                            </div>
                            <div class="stat-info">
                                <span>${label}</span>
                                <strong>${value} <small style="font-size: 0.8rem; font-weight: 400; opacity: 0.7;">${unit}</small></strong>
                            </div>
                        </div>
                    `;

                    const icons = {
                        speed: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
                        temp: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
                        alt: '<path d="m8 3 4-2 4 2"/><path d="M12 1v22"/><path d="m16 21-4 2-4-2"/>',
                        alarm: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
                        radio: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>',
                        rain: '<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16v4"/><path d="M12 18v4"/><path d="M16 16v4"/>'
                    };

                    statsDiv.innerHTML = `
                        ${createStatCard('Max Speed', entry.Max_Speed || 0, 'km/h', icons.speed)}
                        ${createStatCard('Avg Speed', parseFloat(entry.Average_Speed).toFixed(1) || 0, 'km/h', icons.speed)}
                        ${createStatCard('Max Temp', entry.Max_Temp || 0, '°C', icons.temp)}
                        ${createStatCard('Avg Temp', parseFloat(entry.Average_Temp).toFixed(1) || 0, '°C', icons.temp)}
                        ${createStatCard('Min Temp', entry.Min_Temp || 0, '°C', icons.temp)}
                        ${createStatCard('Max Altitude', entry.Max_Altitude || 0, 'm', icons.alt)}
                        ${createStatCard('Total Alarms', entry.Alarm_Count || 0, '', icons.alarm)}
                        ${createStatCard('Radio Beacons', entry.Beacon_Count || 0, '', icons.radio)}
                        ${createStatCard('Precipitation', entry.Total_Precipitation || 0, 'mm', icons.rain)}
                    `;
                } else {
                    statsDiv.innerHTML = '<div class="stat-box" style="grid-column: 1/-1; text-align: center;"><strong>No data available for this date.</strong></div>';
                }
                document.getElementById('chartTitle').innerText = `Daily Overview: ${dateStr}`;
                return;
            }

            chartCanvas.style.display = 'block';
            statsDiv.style.display = 'none';

            const ctx = document.getElementById('historyChart').getContext('2d');
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: metricLabel,
                        data: values,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#3b82f6',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#334155' },
                            ticks: { 
                                color: '#94a3b8',
                                maxTicksLimit: 8,
                                font: { size: window.innerWidth < 600 ? 10 : 12 }
                            }
                        },
                        x: {
                            grid: { color: '#334155' },
                            ticks: { 
                                color: '#94a3b8',
                                maxRotation: 45,
                                minRotation: 45,
                                font: { size: window.innerWidth < 600 ? 10 : 12 }
                            }
                        }
                    }
                }
            });

            document.getElementById('chartTitle').innerText = `${metricLabel} ${titleSuffix}`;
        }

        document.getElementById('rangeSelect').addEventListener('change', adjustDatePicker);
        document.getElementById('metricSelect').addEventListener('change', updateChart);
        document.getElementById('datePicker').addEventListener('change', updateChart);

        document.addEventListener('DOMContentLoaded', fetchData);