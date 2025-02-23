import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as Papa from 'papaparse';
import * as Chartist from 'chartist';

/**
 * Custom animation interface for Chartist slice animations.
 */
export interface IExtendedAnimationDefinition {
  id?: string;
  begin?: string | number;
  dur?: number;
  from?: string;
  to?: string;
  easing?: any; // Accepts string or easing object
  fill?: string;
}

interface Supplier {
  identifiedSuppliers: string;
  industry: string;
  finalScore: number;
  linkedinPage: string;
  website: string;
  companySize: string;
  founded: string;
  locations: string;
  mentionedLinks: string;
  description?: string;
  showLocations?: boolean; 

}

@Component({
  selector: 'app-typography',
  templateUrl: './typography.component.html',
  styleUrls: ['./typography.component.css']
})
export class TypographyComponent implements OnInit {

  CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vReAas3I3xWEHiz2DiGKnpBX7T72I60_WBrvKD6Xxr25IvoRJICezNT8TdheaHZJXZ4-Z68ax2jqch-/pub?gid=568022392&single=true&output=csv';

  suppliers: Supplier[] = [];
  topSuppliers: Supplier[] = [];  // <--- NEW
  companiesCount: number = 0;
  foundedYearCounts: { [year: string]: number } = {};
  companySizeCounts: { [size: string]: number } = {};

  // UI State
  isLoading = true;
  hasError = false;
  errorMessage = '';

  constructor(private http: HttpClient) { }

  ngOnInit() {
    // Load CSV data on init
    this.loadCsvData();
  }

  /** Load CSV data using PapaParse */
  loadCsvData(): void {
    this.isLoading = true;
    this.hasError = false;

    this.http.get(this.CSV_URL, { responseType: 'text' })
      .subscribe({
        next: (csvData: string) => {
          Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
              const data: Supplier[] = results.data.map((d: any) => ({
                identifiedSuppliers: d['Identified Suppliers'] || '',
                industry: d['Industry'] || '',
                finalScore: +d['Final Score'] || 0,
                linkedinPage: d['LinkedIn Page'] || '',
                website: d['Website'] || '',
                companySize: d['Company Size'] || '',
                founded: d['Founded'] || '',
                locations: d['Locations'] || '',
                mentionedLinks: d['Mentioned Links'] || '',
                description: d['Description'] || ''
              }));

              // Filter: only rows with a valid founded date and positive finalScore
              this.suppliers = data.filter(s => s.founded && s.finalScore > 0);
              this.companiesCount = this.suppliers.length;

              // Determine the top 4 (or however many) suppliers by finalScore
              this.topSuppliers = [...this.suppliers]
                .sort((a, b) => b.finalScore - a.finalScore)
                .slice(0, 4);

              // Aggregate data
              this.aggregateFoundedYears();
              this.aggregateCompanySizes();

              // Mark loading complete, then init charts after the view updates
              this.isLoading = false;
              setTimeout(() => this.initCharts(), 0);
            },
            error: (err: any) => {
              this.hasError = true;
              this.errorMessage = 'Error parsing CSV data.';
              this.isLoading = false;
            }
          });
        },
        error: (error) => {
          this.hasError = true;
          this.errorMessage = 'Error loading CSV data. Please try again later.';
          this.isLoading = false;
        }
      });
  }

  /** Aggregate companies by founded year */
  aggregateFoundedYears(): void {
    this.foundedYearCounts = {};
    this.suppliers.forEach(supplier => {
      const year = supplier.founded.trim();
      if (year) {
        this.foundedYearCounts[year] = (this.foundedYearCounts[year] || 0) + 1;
      }
    });
  }

  /** Aggregate companies by size */
  aggregateCompanySizes(): void {
    this.companySizeCounts = {};
    this.suppliers.forEach(supplier => {
      const size = supplier.companySize || 'Unknown';
      this.companySizeCounts[size] = (this.companySizeCounts[size] || 0) + 1;
    });
  }

  /** Animation for line/area charts */
  startAnimationForLineChart(chart) {
    let seq = 0, delays = 80, durations = 500;
    chart.on('draw', function(data) {
      if (data.type === 'line' || data.type === 'area') {
        data.element.animate({
          d: {
            begin: 600,
            dur: 700,
            from: data.path.clone()
              .scale(1, 0)
              .translate(0, data.chartRect.height())
              .stringify(),
            to: data.path.clone().stringify(),
            easing: Chartist.Svg.Easing.easeOutQuint
          }
        });
      } else if (data.type === 'point') {
        seq++;
        data.element.animate({
          opacity: {
            begin: seq * delays,
            dur: durations,
            from: 0,
            to: 1,
            easing: 'ease'
          }
        });
      }
    });
    seq = 0;
  }

  /** Animation for bar charts */
  startAnimationForBarChart(chart) {
    let seq2 = 0, delays2 = 80, durations2 = 500;
    chart.on('draw', function(data) {
      if (data.type === 'bar') {
        seq2++;
        data.element.animate({
          opacity: {
            begin: seq2 * delays2,
            dur: durations2,
            from: 0,
            to: 1,
            easing: 'ease'
          }
        });
      }
    });
    seq2 = 0;
  }

  /** Animation for pie/donut charts */
  startAnimationForPieChart(chart) {
    let seq3 = 0, delays3 = 80, durations3 = 500;
    chart.on('draw', (data: any) => {
      if (data.type === 'slice') {
        data.element.animate({
          opacity: {
            begin: seq3 * delays3,
            dur: durations3,
            from: 0,
            to: 1,
            easing: 'ease'
          }
        });
        seq3++;
      }
    });
    seq3 = 0;
  }

  /** Initialize charts after data is ready */
  initCharts(): void {
    // 1) Bar Chart: Companies Founded per Year
    // 1) Gather and sort your year labels & counts
    const years = Object.keys(this.foundedYearCounts).sort(); // e.g. ['1920', '1921', '1995', '2020', ...]
    const counts = years.map(year => this.foundedYearCounts[year]);

    // 2) Build the chart data as usual
    const dataFoundedYearChart: any = {
      labels: years,
      series: [counts]
    };

    const optionsFoundedYearChart: any = {
      axisX: {
        showGrid: false,
        // 3) Only show last 2 digits in the X-axis labels
        labelInterpolationFnc: function(value) {
          // If `value` is a string like "1995", slice(-2) returns "95".
          // If `value` is a number, you can do: return (value % 100).toString();
          return value.slice(-2);
        }
      },
      low: 0,
      high: Math.max(...counts) + 5,
      chartPadding: { top: 0, right: 5, bottom: 0, left: 0 }
    };

    // 4) Create the bar chart with the modified options
    const foundedYearChart = new Chartist.Bar('#foundedYearChart', dataFoundedYearChart, optionsFoundedYearChart);
    this.startAnimationForBarChart(foundedYearChart);


    // 2) Line Chart: Industry Distribution
    // Aggregate industry counts
    const industryCounts: { [industry: string]: number } = {};
    this.suppliers.forEach(supplier => {
      const industry = supplier.industry || 'Unknown';
      industryCounts[industry] = (industryCounts[industry] || 0) + 1;
    });

    // 2) Convert to array and sort descending by count
    const industryArray = Object.entries(industryCounts).map(([industry, count]) => ({
      industry,
      count
    }));
    industryArray.sort((a, b) => b.count - a.count);

    // 3) Slice top 5 industries
    const top5 = industryArray.slice(0, 5);

    // 4) Build separate arrays for Chartist
    const industries = top5.map(item => item.industry);
    const industryData = top5.map(item => item.count);

    // 5) Create chart data
    const dataIndustryChart: any = {
      labels: industries,  // e.g. ["Software", "Technology", "Oil", ...] (only top 5)
      series: [industryData]
    };

    // 6) Chart options, including labelInterpolationFnc for shortened labels
    const optionsIndustryChart: any = {
      lineSmooth: Chartist.Interpolation.cardinal({ tension: 0 }),
      low: 0,
      high: Math.max(...industryData) + 5,
      chartPadding: { top: 0, right: 0, bottom: 0, left: 0 },
      axisX: {
        labelInterpolationFnc: (value: string) => {
          // Extract first three chars in lowercase
          const shortKey = value.slice(0, 3).toLowerCase();
          // Map them to a more descriptive name (extend as needed)
          const shortDescriptions: { [key: string]: string } = {
            sof: 'Software',
            tec: 'Tech',
            oil: 'Oil',
            inf: 'Info Tech',
            bus: 'Business',
            con: 'Consulting',
            sta: 'Staffing', // or 'Startup', or anything else
            // ...
          };
          
          // Return mapped name or fallback to uppercase shortKey
          return shortDescriptions[shortKey] || shortKey.toUpperCase();
        }
      }
    };

    // 7) Build the line chart
    const industryChart = new Chartist.Line('#industryChart', dataIndustryChart, optionsIndustryChart);
    this.startAnimationForLineChart(industryChart);

    // 1) Get all labels & corresponding series values
    const sizeLabels = Object.keys(this.companySizeCounts);
    const sizeSeries = sizeLabels.map(label => this.companySizeCounts[label]);

    // 2) Slice to only the first 5
    const top5Labels = sizeLabels.slice(0, 5);
    const top5Series = sizeSeries.slice(0, 5);

    // 3) Combine labels & values into objects so we can sort them
    const labeledSeries = top5Labels.map((label, i) => {
      // Remove all commas from the label (e.g., "1,000-5,000" → "1000-5000")
      let cleanedLabel = label.replace(/,/g, '');

      // If there's a dash, keep only the substring after the dash
      const dashIndex = cleanedLabel.indexOf('-');
      let processedLabel: string;
      if (dashIndex !== -1) {
        processedLabel = cleanedLabel.substring(dashIndex + 1).trim(); // e.g. "1000-5000" → "5000"
      } else {
        processedLabel = cleanedLabel; // If no dash, just keep the cleaned label
      }

      return {
        originalLabel: label,
        processedLabel: processedLabel,   // e.g., "5000"
        value: top5Series[i]
      };
    });

    // 4) Sort ascending by numeric value of processedLabel
    labeledSeries.sort((a, b) => {
      return parseInt(a.processedLabel, 10) - parseInt(b.processedLabel, 10);
    });

    // 5) Build final arrays for Chartist
    const sortedLabels = labeledSeries.map(item => item.processedLabel);
    const sortedSeries = labeledSeries.map(item => item.value);

    const dataEmployeeChart: any = {
      labels: sortedLabels,     // e.g., ["10", "50", "200", "500", "5000"]
      series: [sortedSeries]
    };

    const optionsEmployeeChart: any = {
      lineSmooth: Chartist.Interpolation.cardinal({ tension: 0 }),
      low: 0,
      high: Math.max(...sortedSeries) + 5,
      chartPadding: { top: 0, right: 0, bottom: 0, left: 0 }
    };

    const employeeChart = new Chartist.Line('#employeeChart', dataEmployeeChart, optionsEmployeeChart);
    this.startAnimationForLineChart(employeeChart);
      }

// Toggle all locations for a supplier
toggleLocations(supplier: Supplier): void {
  supplier.showLocations = !supplier.showLocations;
}

// Return an array of all locations (split by ';')
getLocationsArray(locations: string): string[] {
  if (!locations) return [];
  return locations.split(';').map(loc => loc.trim()).filter(loc => loc);
}

// Return the first location from the locations string
getFirstLocation(locations: string): string {
  const locs = this.getLocationsArray(locations);
  return locs.length ? locs[0] : '';
}

}