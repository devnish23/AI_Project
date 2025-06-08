def generate_html_report(hostname, compliant_count, non_compliant_count, results):
    """
    Generates an HTML report with dynamic filtering functionality for compliance and non-compliance results.
    """
    html_content = f"""
    <html>
    <head>
        <title>Compliance Report</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
            }}
            .summary {{
                font-size: 18px;
                margin-bottom: 20px;
            }}
            .compliant {{
                background-color: #d0f0fd; /* Light Blue */
            }}
            .non-compliant {{
                background-color: #ffd6d6; /* Red */
            }}
            .summary-compliant {{
                color: #007bff; /* Blue */
            }}
            .summary-non-compliant {{
                color: #dc3545; /* Red */
            }}
            .search-container {{
                margin-bottom: 20px;
            }}
            #filter-input {{
                width: 300px;
                padding: 5px;
            }}
        </style>
        <script>
            function filterResults() {{
                var input = document.getElementById("filter-input").value.toLowerCase();
                var rows = document.getElementsByTagName("tr");

                for (var i = 1; i < rows.length; i++) {{
                    var status = rows[i].getElementsByTagName("td")[3]; // Status is in the 4th column
                    if (status) {{
                        var textValue = status.textContent || status.innerText;
                        if (textValue.toLowerCase().indexOf(input) > -1) {{
                            rows[i].style.display = "";
                        }} else {{
                            rows[i].style.display = "none";
                        }}
                    }}
                }}
            }}
        </script>
    </head>
    <body>
        <h1>Compliance Report for {hostname}</h1>
        <div class="summary">
            <p><b>Compliant:</b> <span class="summary-compliant">{compliant_count}</span></p>
            <p><b>Non-Compliant:</b> <span class="summary-non-compliant">{non_compliant_count}</span></p>
        </div>
        <div class="search-container">
            <label for="filter-input"><b>Filter Results:</b></label>
            <input type="text" id="filter-input" placeholder="Type 'non' or 'comp' to filter results" onkeyup="filterResults()">
        </div>
        <table border="1" cellpadding="5" cellspacing="0">
            <tr>
                <th>Setting</th>
                <th>Expected</th>
                <th>Current</th>
                <th>Status</th>
            </tr>
    """
    for result in results:
        status = "Compliant" if result["Compliant"] else "Non-Compliant"
        row_class = "compliant" if result["Compliant"] else "non-compliant"
        html_content += f"""
            <tr class="{row_class}">
                <td>{result['Setting']}</td>
                <td>{result['Expected']}</td>
                <td>{result['Current']}</td>
                <td>{status}</td>
            </tr>
        """
    html_content += """
        </table>
    </body>
    </html>
    """

    with open("compliance_report.html", "w") as file:
        file.write(html_content)

    messagebox.showinfo("Success", "Compliance report generated successfully!")
    save_as_pdf_option(html_content)
