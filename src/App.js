import { useEffect, useState } from "react";
import Papa from "papaparse";
import Table from "react-bootstrap/Table";

const allowedExtensions = ["csv"];

function App() {
  const [error, setError] = useState("");
  const [file, setFile] = useState("");
  const [filteredData, setFilteredData] = useState({});
  const [coupleWithMostDays, setCoupleWithMostDays] = useState({});

  const handleFileChange = (e) => {
    setError("");

    if (e.target.files.length) {
      const inputFile = e.target.files[0];

      const fileExtension = inputFile?.type.split("/")[1];
      if (!allowedExtensions.includes(fileExtension)) {
        setError("Please input a csv file");
        return;
      }

      setFile(inputFile);
    }
  };

  const handleParse = () => {
    if (!file) return setError("Enter a valid file");

    const reader = new FileReader();

    reader.onload = async ({ target }) => {
      const csv = Papa.parse(target.result, { header: true });

      await calculatingDays(csv.data);
      await findMostColaboration(filteredData);
    };
    
    reader.readAsText(file);

  };

  const checkHowManyDaysOverlap = (employee1, employee2) => {
    const employee1StartDate = new Date(employee1.DateFrom);
    let employee1EndDate;
    const employee2StartDate = new Date(employee2.DateFrom);
    let employee2EndDate;

    if (employee1.DateTo === null || employee1.DateTo.toLowerCase() === "null") {
      employee1EndDate = new Date();
    } else {
      employee1EndDate = new Date(employee1.DateTo)
    }

    if (employee2.DateTo === null || employee2.DateTo.toLowerCase() === "null") {
      employee2EndDate = new Date();
    } else {
      employee2EndDate = new Date(employee2.DateTo)
    }

    if (employee1StartDate <= employee2EndDate && employee1EndDate >= employee2StartDate) {
      const laterStart = employee1StartDate > employee2StartDate ? employee1StartDate : employee2StartDate;
      const firstEnd = employee1EndDate < employee2EndDate ? employee1EndDate : employee2EndDate;
      const timeTogether = Math.abs(firstEnd - laterStart);
      return Math.floor(timeTogether / (1000 * 60 * 60 * 24));
    } else {
      return 0
    }
  }

  const calculatingDays = async (data) => {
    const employees = {};
    const projects = {};

    data.forEach(entry => {
      if (!projects[entry.ProjectId]) {
        projects[entry.ProjectId] = [entry];
      } else {
        projects[entry.ProjectId].push(entry);
      }
    });

    for await (let project of Object.values(projects)) {
      for (let i = 0; i < project.length; i++) {
        for (let j = i + 1; j < project.length; j++) {
          let daysTogether = checkHowManyDaysOverlap(project[i], project[j])

          if (daysTogether) {
            if (!employees.hasOwnProperty(project[i].EmpID + "-" + project[j].EmpID)
              && !employees.hasOwnProperty(project[j].EmpID + "-" + project[i].EmpID)) {
              employees[project[i].EmpID + "-" + project[j].EmpID] = [{
                project: project[0].ProjectId,
                days: daysTogether
              }];
            } else if (employees[project[i].EmpID + "-" + project[j].EmpID]) {
              if (employees[project[i].EmpID + "-" + project[j].EmpID].find((obj) => {
                return obj.project === project[0].ProjectId;
              })) {
                employees[project[i].EmpID + "-" + project[j].EmpID].find((obj) => {
                  return obj.project === project[0].ProjectId;
                }).days += daysTogether;
              } else {
                employees[project[i].EmpID + "-" + project[j].EmpID].push({
                  project: project[0].ProjectId,
                  days: daysTogether
                });
              }
            } else if (employees[project[j].EmpID + "-" + project[i].EmpID]) {
              if (employees[project[j].EmpID + "-" + project[i].EmpID].find((obj) => {
                return obj.project === project[0].ProjectId;
              })) {
                employees[project[j].EmpID + "-" + project[i].EmpID].find((obj) => {
                  return obj.project === project[0].ProjectId;
                }).days += daysTogether;
              } else {
                employees[project[j].EmpID + "-" + project[i].EmpID].push({
                  project: project[0].ProjectId,
                  days: daysTogether
                });
              }
            }
          }
        }
      }
    }
    
    setFilteredData(employees);
  }

  const findMostColaboration = async (data) => {
    let mostDays = {
      couple: "",
      days: 0,
    };

    for await (let couple of Object.entries(data)){
      let total = couple[1].reduce((total, days) => total + days.days, 0);

      if (total > mostDays.days) {
        mostDays.couple = couple[0];
        mostDays.days = total
      }
    }

    setCoupleWithMostDays(mostDays);
  }

  return (
    <div className="App">
      <label htmlFor="csvInput" style={{ display: "block" }}>
        Select CSV File
      </label>
      <input
        onChange={handleFileChange}
        id="csvInput"
        name="file"
        type="File"
        style={{ marginTop: "0.5rem" }}
      />
      <div style={{ marginTop: "0.5rem" }}>
        <button onClick={handleParse}>Parse</button>
      </div>
      <div style={{ marginTop: "3rem" }}>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Employee ID #1</th>
              <th>Employee ID #2</th>
              <th>Project ID</th>
              <th>Days worked</th>
            </tr>
          </thead>
          <tbody>
            {error ? <tr><td>{error}</td></tr> : filteredData[coupleWithMostDays.couple]?.map((arr, i) => (
              <tr key={i}>
                <td>{coupleWithMostDays?.couple.split("-")[0] || ""}</td>
                <td>{coupleWithMostDays?.couple.split("-")[1] || ""}</td>
                <td>{arr.project}</td>
                <td>{arr.days}</td>
              </tr>
            ))}
            <tr>
              <td>Total:</td>
              <td></td>
              <td></td>
              <td>{coupleWithMostDays.days}</td>
            </tr>
          </tbody>
        </Table>
      </div>
    </div>
  );
}

export default App;
