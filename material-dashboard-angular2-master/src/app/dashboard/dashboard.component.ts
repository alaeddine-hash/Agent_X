import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as Papa from 'papaparse';
import { Chart, registerables } from 'chart.js';

/**
 * Quadrant plugin: draws four color fills around (x=20, y=(maxY/2)).
 */
const quadrants = {
  id: 'quadrants',
  beforeDraw(chart: any) {
    const {ctx, chartArea: {left, top, right, bottom}, scales: {x, y}} = chart;
    // "center" for quadrants: x=20, y=(maxY/2)
    const midX = x.getPixelForValue(20);
    const midY = y.getPixelForValue((y.options.max + y.options.min) / 2);

    ctx.save();

    // top-left quadrant => x<20, y> mid => light red
    ctx.fillStyle = 'rgba(244, 67, 54, 0.1)';
    ctx.fillRect(left, top, midX - left, midY - top);

    // top-right quadrant => x>20, y> mid => light blue
    ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
    ctx.fillRect(midX, top, right - midX, midY - top);

    // bottom-right quadrant => x>20, y< mid => light green
    ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
    ctx.fillRect(midX, midY, right - midX, bottom - midY);

    // bottom-left quadrant => x<20, y< mid => light amber
    ctx.fillStyle = 'rgba(255, 193, 7, 0.1)';
    ctx.fillRect(left, midY, midX - left, bottom - midY);

    ctx.restore();
  }
};

/**
 * labelsPlugin: draws text labels in each quadrant region.
 */
const labelsPlugin = {
  id: 'labelsPlugin',
  afterDatasetsDraw(chart: any) {
    const {ctx, scales: {x, y}} = chart;
    const maxY = y.options.max;

    // Adjust these label positions as desired
    const labelPositions = [
      { text: 'Dinosaurs', xDomain: 18, yDomain: 0.25 * maxY },
      { text: 'Gorillas',  xDomain: 18, yDomain: 0.75 * maxY },
      { text: 'Monkeys',   xDomain: 23, yDomain: 0.75 * maxY }
    ];

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; 
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';

    labelPositions.forEach(lbl => {
      const pixelX = x.getPixelForValue(lbl.xDomain);
      const pixelY = y.getPixelForValue(lbl.yDomain);
      ctx.fillText(lbl.text, pixelX, pixelY);
    });

    ctx.restore();
  }
};

interface CompanyData {
  Founded: number;
  'Final Score': number;
  SupplierName: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {

  CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vReAas3I3xWEHiz2DiGKnpBX7T72I60_WBrvKD6Xxr25IvoRJICezNT8TdheaHZJXZ4-Z68ax2jqch-/pub?gid=568022392&single=true&output=csv';
  private quadrantChart: any;

  constructor(private http: HttpClient) {
    // Register Chart.js + the plugins
    Chart.register(...registerables, quadrants, labelsPlugin);
  }

  ngOnInit(): void {
    // Additional logic if needed
  }

  ngAfterViewInit(): void {
    this.loadQuadrantChart();
  }

  /**
   * transformFounded: The Altair transform logic
   * if Founded >= 2020 => 20 + (Founded-2020)
   * else => 20 - (2020-Founded)/5
   */
  transformFounded(year: number): number {
    if (year >= 2020) {
      return 20 + (year - 2020);
    } else {
      return 20 - (2020 - year) / 5;
    }
  }

  /**
   * invertTransform: given a domain value x, return the real year
   */
  invertTransform(val: number): number {
    if (val >= 20) {
      // e.g. val=23 => 2023
      return 2020 + (val - 20);
    } else {
      // e.g. val=19 => 2015
      return 2020 - (20 - val) * 5;
    }
  }

  loadQuadrantChart(): void {
    this.http.get(this.CSV_URL, { responseType: 'text' }).subscribe(csvData => {
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // 1) Parse CSV
          const dataArr: CompanyData[] = results.data.map((row: any) => ({
            Founded: +row['Founded'] || null,
            'Final Score': +row['Final Score'] || 0,
            SupplierName: row['Identified Suppliers'] || ''  // <-- NEW
          }));

          // 2) Filter out invalid & < 1995
          const filtered = dataArr.filter(d =>
            d.Founded != null && d.Founded >= 1995 && !isNaN(d.Founded) && d['Final Score'] > 0
          );

          // 3) maxY => at least 60
          const dataMax = Math.max(...filtered.map(d => d['Final Score']), 0);
          const maxY = Math.max(60, dataMax);

          // 4) Scatter points
          const scatterPoints = filtered.map(d => ({
            x: this.transformFounded(d.Founded),
            y: d['Final Score'],
            name: d.SupplierName            // <-- NEW
          }));

          // partial horizontal from year=1995 => x=15 to year=2020 => x=20 at y= maxY/2
          const partialLineData = [
            { x: 15, y: maxY / 2 }, // year=1995
            { x: 20, y: maxY / 2 }  // year=2020
          ];

          // vertical line at x=20 => from y=0..maxY
          const verticalLineData = [
            { x: 20, y: 0 },
            { x: 20, y: maxY }
          ];

          // Build the chart data
          const chartData = {
            datasets: [
              {
                label: 'Companies',
                data: scatterPoints,
                backgroundColor: 'rgba(63, 81, 181, 0.8)', 
                showLine: false,
                pointRadius: 4
              },
              {
                label: 'Partial Horizontal',
                data: partialLineData,
                borderColor: 'rgba(0,0,0,0.6)',
                borderWidth: 2,
                showLine: true,
                pointRadius: 0
              },
              {
                label: 'Vertical at 2020',
                data: verticalLineData,
                borderColor: 'rgba(0,0,0,0.6)',
                borderWidth: 2,
                showLine: true,
                pointRadius: 0
              }
            ]
          };

          const yearTicks = [
            1995, 2000, 2005, 2010, 2015, 2020, // increments de 5
            2021, 2022, 2023, 2024, 2025, 2026 // increments de 1
          ];
          
          // On transforme ces années en valeurs de l’axe (x = transformFounded(year))
          const domainTicks = yearTicks.map(y => this.transformFounded(y));
          
          const config: any = {
            type: 'scatter',
            data: chartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: {
                  type: 'linear',
                  min: 15, // 1995 => x=15
                  max: 26, // 2026 => x=26
                  title: {
                    display: true,
                    text: 'Founded',
                    color: '#444'
                  },
                  ticks: {
                    // On veut dessiner ces valeurs précises (transformées)
                    values: domainTicks,         // [15,16,17,18,19,20,21,22,23,24,25,26]
                    autoSkip: false,             // ne saute aucune graduation
                    maxTicksLimit: domainTicks.length, // force l’affichage de toutes
                    stepSize: 1,                 // incrément de 1 entre chaque tick
                    callback: (val: number) => this.invertTransform(val),
                    color: '#444'
                  },
                  grid: {
                    color: 'rgba(0,0,0,0.2)',       // Couleur de la grille
                    borderColor: 'rgba(0,0,0,0.6)', // Bordure de l’axe
                    borderWidth: 2,
                    lineWidth: 1,
                    drawOnChartArea: true,
                    drawTicks: true
                  }
                },
                y: {
                  min: 0,
                  max: maxY,
                  title: {
                    display: true,
                    text: 'Final Score',
                    color: '#444'
                  },
                  ticks: {
                    color: '#444'
                  },
                  grid: {
                    color: 'rgba(0,0,0,0.2)',
                    borderColor: 'rgba(0,0,0,0.6)',
                    borderWidth: 2,
                    lineWidth: 1,
                    drawOnChartArea: true,
                    drawTicks: true
                  }
                }
              },
              plugins: {
                quadrants: {},
                labelsPlugin: {},
                tooltip: {
                  callbacks: {
                    label: (ctx: any) => {
                      const realYear = this.invertTransform(ctx.raw.x);
                      const score = ctx.raw.y;
                      const supplierName = ctx.raw.name || 'Unknown Supplier';
                      return `Supplier: ${supplierName}\nFounded Year: ${realYear}, Score: ${score}`;
                    }
                  }
                }
              },
              layout: {
                padding: 20
              }
            }
          };
          
          

          // Destroy old chart if any
          if (this.quadrantChart) {
            this.quadrantChart.destroy();
          }
          const ctx = (document.getElementById('myQuadrantChart') as HTMLCanvasElement).getContext('2d');
          this.quadrantChart = new Chart(ctx, config);
        }
      });
    });
  }
}
